import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SO_ASSET_USER' | 'VIEWER';
  name: string;
}

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT utilities
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

// User utilities
export const findUserByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, password, isactive, createdat, updatedat')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  // Map column names to match expected interface
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    password: data.password,
    isActive: data.isactive,
    createdAt: data.createdat,
    updatedAt: data.updatedat
  };
};

export const findUserById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, isactive, createdat, updatedat, createdby')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  // Map column names to match expected interface
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    isActive: data.isactive,
    createdAt: data.createdat,
    updatedAt: data.updatedat,
    createdBy: data.createdby
  };
};

// Authentication utilities
export const authenticateUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.password);

  if (!isValidPassword) {
    return null;
  }

  // Remove password from user object
  const { password: _, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

// Role checking utilities
export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    'ADMIN': 3,
    'SO_ASSET_USER': 2,
    'VIEWER': 1
  };

  return roleHierarchy[userRole as keyof typeof roleHierarchy] >=
         roleHierarchy[requiredRole as keyof typeof roleHierarchy];
};

export const canAccessSOAsset = (userRole: string): boolean => {
  return userRole === 'ADMIN' || userRole === 'SO_ASSET_USER';
};

export const canCancelSOSession = (userRole: string): boolean => {
  return userRole === 'ADMIN';
};

export const canManageUsers = (userRole: string): boolean => {
  return userRole === 'ADMIN';
};

export const canCreateAssets = (userRole: string): boolean => {
  return userRole === 'ADMIN' || userRole === 'SO_ASSET_USER';
};

export const canEditAssets = (userRole: string): boolean => {
  return userRole === 'ADMIN' || userRole === 'SO_ASSET_USER';
};

export const canDeleteAssets = (userRole: string): boolean => {
  return userRole === 'ADMIN';
};