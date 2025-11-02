import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE() {
  try {
    const { data, error } = await supabaseAdmin
      .from("assets")
      .delete()
      .neq("id", "")
      .select("id");

    if (error) {
      console.error("Delete all assets error:", error);
      return NextResponse.json(
        { error: "Failed to delete assets", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length ?? 0,
    });
  } catch (error: any) {
    console.error("Unexpected delete all assets error:", error);
    return NextResponse.json(
      { error: "Failed to delete assets", details: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
