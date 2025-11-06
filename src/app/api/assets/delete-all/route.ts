import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE() {
  try {
    const deleted = await db.asset.deleteMany();

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
    });
  } catch (error: any) {
    console.error("Unexpected delete all assets error:", error);
    return NextResponse.json(
      { error: "Failed to delete assets", details: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
