import { db } from './db';

type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number; // seconds
};

type SlidingWindowStore = Map<string, number[]>;

const loginRequestStore: SlidingWindowStore = new Map();
const loginFailureStore: SlidingWindowStore = new Map();

const config = {
  enabled: process.env.DISABLE_LOGIN_RATE_LIMIT !== 'true',
  ipLimit: Number(process.env.LOGIN_IP_LIMIT) || 20,
  ipWindowMs: (Number(process.env.LOGIN_IP_WINDOW) || 600) * 1000,
  failLimit: Number(process.env.LOGIN_FAIL_LIMIT) || 5,
  failWindowMs: (Number(process.env.LOGIN_FAIL_WINDOW) || 300) * 1000,
  dbFailLimit: Number(process.env.LOGIN_DB_FAIL_LIMIT) || Number(process.env.LOGIN_FAIL_LIMIT) || 5,
  dbFailWindowMs: (Number(process.env.LOGIN_DB_FAIL_WINDOW) || Number(process.env.LOGIN_FAIL_WINDOW) || 300) * 1000,
};

const now = () => Date.now();

const cleanupWindow = (store: SlidingWindowStore, key: string, windowMs: number, current: number) => {
  const hits = store.get(key);
  if (!hits) return [];
  const filtered = hits.filter((ts) => current - ts < windowMs);
  if (filtered.length === 0) {
    store.delete(key);
    return [];
  }
  store.set(key, filtered);
  return filtered;
};

const computeRetryAfter = (current: number, firstTs: number, windowMs: number) =>
  Math.max(1, Math.ceil((windowMs - (current - firstTs)) / 1000));

const incrementAndCheck = (
  store: SlidingWindowStore,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult => {
  if (!config.enabled || limit <= 0) return { allowed: true };
  const current = now();
  const cleaned = cleanupWindow(store, key, windowMs, current);
  cleaned.push(current);
  store.set(key, cleaned);
  if (cleaned.length <= limit) return { allowed: true };
  return {
    allowed: false,
    retryAfter: computeRetryAfter(current, cleaned[0], windowMs),
  };
};

const checkOnly = (
  store: SlidingWindowStore,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult => {
  if (!config.enabled || limit <= 0) return { allowed: true };
  const current = now();
  const cleaned = cleanupWindow(store, key, windowMs, current);
  const allowed = cleaned.length < limit;
  return allowed
    ? { allowed: true }
    : { allowed: false, retryAfter: computeRetryAfter(current, cleaned[0], windowMs) };
};

const makeFailKey = (ip: string, identifier: string) => `${ip}::${identifier.toLowerCase()}`;

export const applyIpRateLimit = (ip: string | undefined | null): RateLimitResult => {
  if (!ip) return { allowed: true };
  return incrementAndCheck(loginRequestStore, ip, config.ipLimit, config.ipWindowMs);
};

export const checkFailMemoryLimit = (
  ip: string | undefined | null,
  identifier: string | undefined | null
): RateLimitResult => {
  if (!ip || !identifier) return { allowed: true };
  return checkOnly(loginFailureStore, makeFailKey(ip, identifier), config.failLimit, config.failWindowMs);
};

export const registerFailMemory = (
  ip: string | undefined | null,
  identifier: string | undefined | null
): RateLimitResult => {
  if (!ip || !identifier) return { allowed: true };
  return incrementAndCheck(loginFailureStore, makeFailKey(ip, identifier), config.failLimit, config.failWindowMs);
};

export const checkDbFailLimit = async (userId: string): Promise<RateLimitResult> => {
  if (!config.enabled || config.dbFailLimit <= 0) return { allowed: true };

  const windowStart = new Date(now() - config.dbFailWindowMs);

  const [failureCount, oldestFailure] = await Promise.all([
    db.loginHistory.count({
      where: { userId, isSuccess: false, loginTime: { gte: windowStart } },
    }),
    db.loginHistory.findFirst({
      where: { userId, isSuccess: false, loginTime: { gte: windowStart } },
      orderBy: { loginTime: 'asc' },
      select: { loginTime: true },
    }),
  ]);

  if (failureCount < config.dbFailLimit) return { allowed: true };

  const oldestTs = oldestFailure?.loginTime.getTime();
  const retryAfter = oldestTs ? computeRetryAfter(now(), oldestTs, config.dbFailWindowMs) : undefined;
  return { allowed: false, retryAfter };
};

export const retryAfterHeader = (result: RateLimitResult) =>
  result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : undefined;

export const getLoginRateLimitConfig = () => config;
