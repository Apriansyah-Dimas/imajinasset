import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { db } from "./db";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "SO_ASSET_USER" | "VIEWER";
  name: string;
}

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
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
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as JWTPayload["role"],
    password: user.password,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const findUserById = async (id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as JWTPayload["role"],
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy,
  };
};

// Authentication function for API routes
export const authenticate = async (
  request: NextRequest
): Promise<{ success: boolean; user?: any }> => {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return { success: false };
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return { success: false };
    }

    // Get user from database
    const user = await findUserByEmail(decoded.email);

    if (!user || !user.isActive) {
      return { success: false };
    }

    // Remove password from user object before returning
    const { password, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false };
  }
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
export const hasPermission = (
  userRole: string,
  requiredRole: string
): boolean => {
  const roleHierarchy = {
    ADMIN: 3,
    SO_ASSET_USER: 2,
    VIEWER: 1,
  };

  return (
    roleHierarchy[userRole as keyof typeof roleHierarchy] >=
    roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  );
};

export const canAccessSOAsset = (userRole: string): boolean => {
  return (
    userRole === "ADMIN" ||
    userRole === "SO_ASSET_USER" ||
    userRole === "VIEWER"
  );
};

export const canCreateSOSession = (userRole: string): boolean => {
  return userRole === "ADMIN";
};

export const canViewSOSession = (userRole: string): boolean => {
  return (
    userRole === "ADMIN" ||
    userRole === "SO_ASSET_USER" ||
    userRole === "VIEWER"
  );
};

export const canScanInSOSession = (userRole: string): boolean => {
  return userRole === "ADMIN" || userRole === "SO_ASSET_USER";
};

export const canCompleteSOSession = (userRole: string): boolean => {
  return userRole === "ADMIN";
};

export const canCancelSOSession = (userRole: string): boolean => {
  return userRole === "ADMIN";
};

export const canManageUsers = (userRole: string): boolean => {
  return userRole === "ADMIN";
};

export const canCreateAssets = (userRole: string): boolean => {
  return userRole === "ADMIN" || userRole === "SO_ASSET_USER";
};

export const canEditAssets = (userRole: string): boolean => {
  return userRole === "ADMIN" || userRole === "SO_ASSET_USER";
};

export const canDeleteAssets = (userRole: string): boolean => {
  return userRole === "ADMIN";
};
