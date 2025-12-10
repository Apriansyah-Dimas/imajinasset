import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Test query untuk mengambil entries dengan notes
    const entriesWithNotes = await db.sOAssetEntry.findMany({
      where: {
        pendingNotes: {
          not: null
        }
      },
      select: {
        id: true,
        tempName: true,
        pendingNotes: true,
        isCrucial: true,
        tempPic: true,
      },
      take: 5,
      orderBy: {
        scannedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Found ${entriesWithNotes.length} entries with notes`,
      data: entriesWithNotes
    });
  } catch (error) {
    console.error("Test notes error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notes",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}