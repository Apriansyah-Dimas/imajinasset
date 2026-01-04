import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { validateEmail, validatePassword, sanitizeTextInput } from '@/lib/validation';
import { parseUserAgent } from '@/lib/user-agent';
import {
  applyIpRateLimit,
  checkDbFailLimit,
  checkFailMemoryLimit,
  registerFailMemory,
  retryAfterHeader,
} from '@/lib/rate-limit';

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('[auth/login] JWT_SECRET is not set. Falling back to development secret. Please set JWT_SECRET in your environment for better security.');
}
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME;

const getClientIp = (request?: NextRequest) => {
  const forwarded = request?.headers.get('x-forwarded-for');
  const headerIp = forwarded?.split(',')[0].trim() || request?.headers.get('x-real-ip');
  return headerIp || request?.ip || '127.0.0.1';
};

async function recordLoginHistory(
  userId: string,
  isSuccess: boolean,
  failureReason?: string,
  request?: NextRequest
) {
  try {
    console.log('DEBUG: Recording login history for userId:', userId, 'isSuccess:', isSuccess);

    const userAgent = request?.headers.get('user-agent') || '';
    const ipAddress = getClientIp(request);

    const parsedUA = parseUserAgent(userAgent);
    console.log('DEBUG: Parsed UA:', parsedUA);

    const result = await db.loginHistory.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        browser: parsedUA.browser,
        os: parsedUA.os,
        device: parsedUA.device,
        isSuccess,
        failureReason,
      }
    });
    console.log('DEBUG: Login history recorded successfully with ID:', result.id);
  } catch (error) {
    console.error('Failed to record login history:', error);
    // Don't fail the login if history recording fails
  }
}

async function ensureDefaultAdmin() {
  // Only proceed if default admin credentials are properly configured
  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_NAME) {
    return; // Skip auto-creation if environment variables are not set
  }

  const defaultAdmin = await db.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL }
  });

  if (!defaultAdmin) {
    // Create default admin only if environment variables are set
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      console.warn('DEFAULT_ADMIN_PASSWORD not set, skipping admin user creation');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await db.user.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        name: DEFAULT_ADMIN_NAME,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
    return;
  }

  const needsRoleUpdate = defaultAdmin.role !== 'ADMIN';
  const needsActivation = !defaultAdmin.isActive;
  const needsName = !defaultAdmin.name;

  if (needsRoleUpdate || needsActivation || needsName) {
    await db.user.update({
      where: { email: DEFAULT_ADMIN_EMAIL },
      data: {
        role: 'ADMIN',
        isActive: true,
        ...(needsName ? { name: DEFAULT_ADMIN_NAME } : {})
      }
    });
  }

  const activeAdminExists = await db.user.findFirst({
    where: {
      role: 'ADMIN',
      isActive: true
    },
    select: { id: true }
  });

  if (!activeAdminExists) {
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      console.warn('DEFAULT_ADMIN_PASSWORD not set, skipping admin password reset');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await db.user.update({
      where: { email: DEFAULT_ADMIN_EMAIL },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const clientIp = getClientIp(request);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeTextInput(email);
    const sanitizedPassword = password; // Don't sanitize password for comparison
    const identifierKey = (sanitizedEmail || '').toLowerCase();

    // Rate limit by IP first to absorb bursts early
    const ipRateLimit = applyIpRateLimit(clientIp);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: retryAfterHeader(ipRateLimit) }
      );
    }

    // Check memory-based per-identifier fail window before hitting DB
    const failMemoryLimit = checkFailMemoryLimit(clientIp, identifierKey);
    if (!failMemoryLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: retryAfterHeader(failMemoryLimit) }
      );
    }

    await ensureDefaultAdmin();

    const user = await db.user.findUnique({
      where: { email: sanitizedEmail }
    });

    if (!user) {
      // Record failed login attempt (user not found)
      const failResult = registerFailMemory(clientIp, identifierKey);
      return NextResponse.json(
        { error: failResult.allowed ? "Invalid credentials" : "Too many login attempts. Please try again later." },
        { status: failResult.allowed ? 401 : 429, headers: failResult.allowed ? undefined : retryAfterHeader(failResult) }
      );
    }

    // Check if user is active (handle undefined case)
    if (!user.isActive) {
      // Record failed login attempt (inactive account)
      const failResult = registerFailMemory(clientIp, identifierKey);
      await recordLoginHistory(user.id, false, 'Account is inactive', request);
      return NextResponse.json(
        { error: failResult.allowed ? "Account is inactive" : "Too many login attempts. Please try again later." },
        { status: failResult.allowed ? 403 : 429, headers: failResult.allowed ? undefined : retryAfterHeader(failResult) }
      );
    }

    // Cross-instance fail limit using persisted login history
    const dbFailLimit = await checkDbFailLimit(user.id);
    if (!dbFailLimit.allowed) {
      await recordLoginHistory(user.id, false, 'rate_limited', request);
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: retryAfterHeader(dbFailLimit) }
      );
    }

    // Verify password (assuming passwords are already hashed in database)
    const isValidPassword = await bcrypt.compare(sanitizedPassword, user.password);

    if (!isValidPassword) {
      // Record failed login attempt (wrong password)
      const failResult = registerFailMemory(clientIp, identifierKey);
      await recordLoginHistory(user.id, false, 'Invalid credentials', request);
      return NextResponse.json(
        { error: failResult.allowed ? "Invalid credentials" : "Too many login attempts. Please try again later." },
        { status: failResult.allowed ? 401 : 429, headers: failResult.allowed ? undefined : retryAfterHeader(failResult) }
      );
    }

    // Record successful login
    await recordLoginHistory(user.id, true, undefined, request);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return user data and token
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
