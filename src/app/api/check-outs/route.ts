import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAssetEvent } from "@/lib/asset-events";

const successResponse = (data: unknown) =>
  NextResponse.json(data, { status: 200 });

export async function GET(request: NextRequest) {
  try {
    console.log("Check-outs GET request received");

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

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const entryId = searchParams.get("id");
    const status = searchParams.get("status");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const parsedLimit = parseInt(searchParams.get("limit") ?? "0", 10);
    const limit =
      parsedLimit > 0 ? Math.min(parsedLimit, 100) : assetId ? undefined : 50;

    console.log("Query params:", { assetId, entryId, status, limit });

    if (entryId) {
      const checkout = await db.assetCheckout.findUnique({
        where: { id: entryId },
        include: {
          assignTo: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true,
            },
          },
          department: { select: { id: true, name: true } },
          receivedBy: {
            select: { id: true, name: true, employeeId: true, email: true },
          },
          asset: { select: { id: true, name: true, noAsset: true } },
        },
      });

      if (!checkout) {
        return NextResponse.json(
          { error: "Checkout record not found" },
          { status: 404 }
        );
      }

      return successResponse({ checkout });
    }

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;
    if (startDateParam) {
      const start = new Date(startDateParam);
      if (!Number.isNaN(start.getTime())) {
        where.checkoutDate = { ...(where.checkoutDate ?? {}), gte: start };
      }
    }
    if (endDateParam) {
      const end = new Date(endDateParam);
      if (!Number.isNaN(end.getTime())) {
        where.checkoutDate = { ...(where.checkoutDate ?? {}), lte: end };
      }
    }

    console.log(
      "Attempting to fetch check-out history with where clause:",
      where
    );

    const history = await db.assetCheckout.findMany({
      where,
      orderBy: { checkoutDate: "desc" },
      take: limit,
      include: {
        assignTo: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
        department: {
          select: { id: true, name: true },
        },
        receivedBy: {
          select: { id: true, name: true, employeeId: true },
        },
        asset: { select: { id: true, name: true, noAsset: true } },
      },
    });

    console.log(
      "Successfully fetched check-out history, count:",
      history.length
    );

    return successResponse({ history });
  } catch (error) {
    console.error("Check-out history fetch error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch check-out history" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
    const assignToId =
      typeof body.assignToId === "string" ? body.assignToId.trim() : "";
    const checkoutDate =
      typeof body.checkoutDate === "string" ? body.checkoutDate : "";

    if (!assetId || !assignToId || !checkoutDate) {
      return NextResponse.json(
        { error: "assetId, assignToId, and checkoutDate are required" },
        { status: 400 }
      );
    }

    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const assignTo = await db.employee.findUnique({
      where: { id: assignToId },
    });
    if (!assignTo) {
      return NextResponse.json(
        { error: "PIC tidak ditemukan" },
        { status: 404 }
      );
    }

    let departmentId: string | null = null;
    if (typeof body.departmentId === "string" && body.departmentId.trim()) {
      const departmentExists = await db.department.findUnique({
        where: { id: body.departmentId.trim() },
      });
      if (!departmentExists) {
        return NextResponse.json(
          { error: "Department tidak ditemukan" },
          { status: 404 }
        );
      }
      departmentId = departmentExists.id;
    }

    const dueDate =
      typeof body.dueDate === "string" && body.dueDate
        ? new Date(body.dueDate)
        : null;
    const parsedCheckoutDate = new Date(checkoutDate);
    if (Number.isNaN(parsedCheckoutDate.getTime())) {
      return NextResponse.json(
        { error: "checkoutDate tidak valid" },
        { status: 400 }
      );
    }
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "dueDate tidak valid" },
        { status: 400 }
      );
    }

    const notes =
      typeof body.notes === "string" && body.notes.trim().length > 0
        ? body.notes.trim()
        : null;
    const signature =
      typeof body.signature === "string" && body.signature.length > 0
        ? body.signature
        : null;

    const checkout = await db.assetCheckout.create({
      data: {
        assetId,
        assignToId,
        departmentId,
        checkoutDate: parsedCheckoutDate,
        dueDate,
        notes,
        signatureData: signature,
      },
      include: {
        assignTo: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    try {
      await recordAssetEvent({
        assetId,
        type: "CHECK_OUT",
        checkoutId: checkout.id,
        payload: {
          assignTo: {
            id: checkout.assignTo?.id ?? assignToId,
            name: checkout.assignTo?.name ?? assignTo?.name ?? null,
            employeeId: checkout.assignTo?.employeeId ?? assignTo?.employeeId ?? null,
          },
          department: checkout.department
            ? { id: checkout.department.id, name: checkout.department.name }
            : null,
          checkoutDate: parsedCheckoutDate.toISOString(),
          dueDate: dueDate ? dueDate.toISOString() : null,
          notes,
          hasSignature: Boolean(signature),
        },
      });
    } catch (eventError) {
      console.error("Failed to record checkout event:", eventError);
    }

    return successResponse({ success: true, checkout });
  } catch (error) {
    console.error("Check-out record creation error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: "Failed to record check-out" },
      { status: 500 }
    );
  }
}
