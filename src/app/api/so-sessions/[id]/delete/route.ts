import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerAuth } from "@/lib/server-auth";
// Import role checking functions from old auth module
const { canCancelSOSession } =
  require("@/lib/auth") as typeof import("@/lib/auth");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      console.log("[DEBUG API] Delete endpoint - User not authenticated");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = auth.user;
    // Check if user has permission to manage SO sessions
    if (!canCancelSOSession(user.role)) {
      console.log("[DEBUG API] Delete endpoint - Insufficient permissions");
      return NextResponse.json(
        { error: "Insufficient permissions to delete SO sessions" },
        { status: 403 }
      );
    }

    const { id: sessionId } = await params;

    // Check if session exists
    const session = await db.sOSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "SO Session not found" },
        { status: 404 }
      );
    }

    // Delete all entries for this session first
    await db.sOAssetEntry.deleteMany({
      where: { soSessionId: sessionId },
    });

    // Delete the session
    await db.sOSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: "SO Session deleted successfully",
    });
  } catch (error) {
    console.error("Delete SO session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
