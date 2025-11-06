import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

const jwtSecret = process.env.JWT_SECRET!;
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@assetso.com';
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME ?? 'Administrator';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123';

async function ensureDefaultAdmin() {
  const defaultAdmin = await db.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL }
  });

  if (!defaultAdmin) {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
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
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
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

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await ensureDefaultAdmin();

    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user is active (handle undefined case)
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Verify password (assuming passwords are already hashed in database)
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

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
