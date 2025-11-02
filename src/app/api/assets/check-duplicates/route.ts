import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { noAssets } = await request.json();

    if (!noAssets || !Array.isArray(noAssets)) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Check for existing NoAsset values
    const existingAssets = await db.asset.findMany({
      where: {
        noAsset: {
          in: noAssets,
        },
      },
      select: {
        noAsset: true,
      },
    });

    const existingNoAssets = existingAssets.map((asset) => asset.noAsset);

    return NextResponse.json(existingNoAssets);
  } catch (error) {
    console.error("Error checking duplicates:", error);
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    );
  }
}
