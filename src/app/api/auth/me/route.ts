import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token with proper error handling
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { error: "Token expired" },
          { status: 401 }
        );
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Token verification failed" },
        { status: 401 }
      );
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User data not found" },
        { status: 404 }
      );
    }

    // Check if user is active (handle undefined case)
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
