import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Check-out return POST request received");
    console.log("Params:", params);

    // Test database connection
    try {
      await db.$connect();
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const checkoutId = params.id;
    if (!checkoutId) {
      return NextResponse.json(
        { error: "Checkout id is required" },
        { status: 400 }
      );
    }

    console.log("Processing return for checkout ID:", checkoutId);

    console.log("Fetching checkout record...");
    const checkout = await db.assetCheckout.findUnique({
      where: { id: checkoutId },
    });
    console.log("Checkout record found:", checkout ? "Yes" : "No");

    if (!checkout) {
      return NextResponse.json(
        { error: "Checkout record not found" },
        { status: 404 }
      );
    }

    if (checkout.status === "RETURNED") {
      return NextResponse.json(
        { error: "Checkout already returned" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const returnedAtInput =
      typeof body.returnedAt === "string" ? body.returnedAt : null;
    const receivedById =
      typeof body.receivedById === "string" && body.receivedById.trim().length
        ? body.receivedById.trim()
        : null;
    const returnNotes =
      typeof body.returnNotes === "string" && body.returnNotes.trim().length
        ? body.returnNotes.trim()
        : null;

    const returnedAt = returnedAtInput ? new Date(returnedAtInput) : new Date();
    if (Number.isNaN(returnedAt.getTime())) {
      return NextResponse.json(
        { error: "returnedAt tidak valid" },
        { status: 400 }
      );
    }

    if (receivedById) {
      const receiver = await db.employee.findUnique({
        where: { id: receivedById },
      });
      if (!receiver) {
        return NextResponse.json(
          { error: "PIC penerima tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    const updated = await db.assetCheckout.update({
      where: { id: checkoutId },
      data: {
        status: "RETURNED",
        returnedAt,
        receivedById,
        returnNotes,
      },
      include: {
        assignTo: { select: { id: true, name: true, employeeId: true } },
        receivedBy: { select: { id: true, name: true, employeeId: true } },
        department: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true, noAsset: true } },
      },
    });

    console.log("Checkout return processed successfully");
    return NextResponse.json({ success: true, checkout: updated });
  } catch (error) {
    console.error("Checkout return error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: "Failed to process check-in" },
      { status: 500 }
    );
  }
}
