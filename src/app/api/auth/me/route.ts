import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    console.log("Auth/me - Checking authentication...");

    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get user data from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, email, name, role, isactive')
      .eq('id', decoded.userId)
      .single();

    if (dbError || !userData) {
      console.error("Auth/me - Database error:", dbError);
      return NextResponse.json(
        { error: "User data not found" },
        { status: 404 }
      );
    }

    // Check if user is active (handle undefined case)
    if (userData.isactive === false) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
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