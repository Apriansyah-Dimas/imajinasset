import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordAssetEvent } from "@/lib/asset-events";
import { authenticate } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticate(request);
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params as required by Next.js 15
    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { returnNotes, returnSignatureData, returnedAt, receivedById } = body;

    // Validate required fields
    if (!returnNotes) {
      return NextResponse.json(
        { error: "Return notes are required" },
        { status: 400 }
      );
    }

    // Find the checkout record
    const checkout = await prisma.assetCheckout.findUnique({
      where: { id },
      include: {
        asset: true,
        assignTo: true,
        department: true,
      },
    });

    if (!checkout) {
      return NextResponse.json(
        { error: "Checkout record not found" },
        { status: 404 }
      );
    }

    // Check if the checkout is already returned
    if (checkout.status === "RETURNED") {
      return NextResponse.json(
        { error: "Asset already returned" },
        { status: 400 }
      );
    }

    // Validate that receivedById exists and is an Employee
    if (!receivedById) {
      return NextResponse.json(
        { error: "Received by ID is required" },
        { status: 400 }
      );
    }

    // Verify the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: receivedById },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Update the checkout record with correct field names from schema
    const updatedCheckout = await prisma.assetCheckout.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnedAt: returnedAt ? new Date(returnedAt) : new Date(),
        returnNotes: returnNotes || null,
        returnSignatureData: returnSignatureData || null,
        receivedById: receivedById,
      },
    });

    try {
      await recordAssetEvent({
        assetId: checkout.assetId,
        type: "CHECK_IN",
        checkoutId: checkout.id,
        payload: {
          assignTo: checkout.assignTo
            ? {
                id: checkout.assignTo.id,
                name: checkout.assignTo.name,
                employeeId: checkout.assignTo.employeeId,
              }
            : null,
          department: checkout.department
            ? { id: checkout.department.id, name: checkout.department.name }
            : null,
          returnedAt: (returnedAt ? new Date(returnedAt) : new Date()).toISOString(),
          returnNotes: returnNotes ?? null,
          receivedById,
          receivedBy: employee.name,
          hasSignature: Boolean(returnSignatureData),
        },
      });
    } catch (eventError) {
      console.error("Failed to record check-in event:", eventError);
    }

    return NextResponse.json({
      message: "Asset returned successfully",
      checkout: updatedCheckout,
    });
  } catch (error) {
    console.error("Error returning asset:", error);
    return NextResponse.json(
      {
        error: "Failed to return asset",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
