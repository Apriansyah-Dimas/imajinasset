import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, canViewSOSession } from "@/lib/auth";

const unauthorized = NextResponse.json(
  { error: "Authentication required" },
  { status: 401 }
);

const forbidden = NextResponse.json(
  { error: "Insufficient permissions" },
  { status: 403 }
);

function extractUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

async function ensureSessionExists(id: string) {
  return db.sOSession.findUnique({
    where: { id },
    select: { id: true, description: true, notes: true }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = extractUser(request);
    if (!user) return unauthorized;
    if (!canViewSOSession(user.role)) return forbidden;

    const { id } = await params;
    const session = await ensureSessionExists(id);

    if (!session) {
      return NextResponse.json(
        { error: "SO Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      notes: session.notes ?? ""
    });
  } catch (error) {
    console.error("Get SO session notes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = extractUser(request);
    if (!user) return unauthorized;
    if (!canViewSOSession(user.role)) return forbidden;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const rawNotes =
      typeof body.notes === "string" ? body.notes : body.description;
    const notes =
      typeof rawNotes === "string" ? rawNotes.slice(0, 5000) : "";

    const session = await ensureSessionExists(id);
    if (!session) {
      return NextResponse.json(
        { error: "SO Session not found" },
        { status: 404 }
      );
    }

    const updatedSession = await db.sOSession.update({
      where: { id },
      data: {
        notes: notes.trim() === "" ? null : notes
      },
      select: {
        id: true,
        notes: true
      }
    });

    return NextResponse.json({
      success: true,
      notes: updatedSession.notes ?? ""
    });
  } catch (error) {
    console.error("Update SO session notes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
