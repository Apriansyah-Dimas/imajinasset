import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerAuth } from "@/lib/server-auth";
// Import role checking functions from old auth module
const { canScanInSOSession } =
  require("@/lib/auth") as typeof import("@/lib/auth");

const parseCostInput = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const pickDefined = (primary: any, secondary: any) =>
  primary !== undefined ? primary : secondary;
const parseDateInput = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const normalizeIdInput = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: sessionId, entryId } = await params;

    // Check authentication first
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      console.log("[DEBUG API] Entries endpoint - User not authenticated");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    // Check permissions
    const user = auth.user;
    if (!canScanInSOSession(user.role)) {
      console.log("[DEBUG API] Entries endpoint - Insufficient permissions");
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get entry with asset data
    const entry = await db.sOAssetEntry.findUnique({
      where: { id: entryId },
      include: {
        asset: {
          include: {
            site: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                email: true,
                department: true,
                position: true,
                isActive: true,
              },
            },
          },
        },
        tempSite: { select: { id: true, name: true } },
        tempCategory: { select: { id: true, name: true } },
        tempDepartment: { select: { id: true, name: true } },
        tempPicEmployee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            position: true,
            isActive: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.soSessionId !== sessionId) {
      return NextResponse.json(
        { error: "Entry does not belong to this session" },
        { status: 400 }
      );
    }

    // Transform data to match expected format (camelCase)
    const transformedEntry = {
      ...entry,
      soSessionId: entry.soSessionId,
      assetId: entry.assetId,
      scannedAt: entry.scannedAt,
      isIdentified: entry.isIdentified,
      isCrucial: entry.isCrucial,
      crucialNotes: entry.crucialNotes,
      tempPurchaseDate: entry.tempPurchaseDate,
      tempName: entry.tempName,
      tempStatus: entry.tempStatus,
      tempNoAsset: entry.tempNoAsset,
      tempSerialNo: entry.tempSerialNo,
      tempPic: entry.tempPic,
      tempNotes: entry.tempNotes,
      tempPicId: (entry.tempPicId ?? entry.asset?.employee?.id) || null,
      tempBrand: entry.tempBrand,
      tempModel: entry.tempModel,
      tempCost: entry.tempCost,
      tempImageUrl: entry.tempImageUrl,
      tempSiteId: entry.tempSiteId,
      tempCategoryId: entry.tempCategoryId,
      tempDepartmentId: entry.tempDepartmentId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      // Include temp relation data
      tempSite: entry.tempSite,
      tempCategory: entry.tempCategory,
      tempDepartment: entry.tempDepartment,
      tempPicEmployee: entry.tempPicEmployee,
      // Include asset data with noAsset field
      asset: entry.asset
        ? {
            ...entry.asset,
            noAsset: entry.asset.noAsset, // Ensure noAsset field is included
          }
        : null,
    };

    return NextResponse.json({
      entry: transformedEntry,
      session,
    });
  } catch (error) {
    console.error("Get SO entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: sessionId, entryId } = await params;

    // Check authentication first
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      console.log("[DEBUG API] Entries PUT - User not authenticated");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check permissions
    const user = auth.user;
    if (!canScanInSOSession(user.role)) {
      console.log("[DEBUG API] Entries PUT - Insufficient permissions");
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();

    console.log(
      "[DEBUG API] Entries PUT - Received update body:",
      JSON.stringify(body, null, 2)
    );
    console.log("[DEBUG API] Entries PUT - Session ID:", sessionId);
    console.log("[DEBUG API] Entries PUT - Entry ID:", entryId);
    console.log("[DEBUG API] Entries PUT - User role:", user.role);

    // Check if session exists and is active
    const session = await db.sOSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "SO Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "Active") {
      return NextResponse.json(
        { error: "SO Session is not active" },
        { status: 400 }
      );
    }

    // Check if entry exists and belongs to this session
    const existingEntry = await db.sOAssetEntry.findUnique({
      where: { id: entryId },
      include: {
        asset: {
          include: {
            site: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                email: true,
                department: true,
                position: true,
                isActive: true,
              },
            },
          },
        },
        tempSite: { select: { id: true, name: true } },
        tempCategory: { select: { id: true, name: true } },
        tempDepartment: { select: { id: true, name: true } },
        tempPicEmployee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            position: true,
            isActive: true,
          },
        },
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (existingEntry.soSessionId !== sessionId) {
      return NextResponse.json(
        { error: "Entry does not belong to this session" },
        { status: 400 }
      );
    }

    // Update entry - ensure undefined fields are ignored while null clears values
    const updateData: any = {
      tempName: pickDefined(body.tempName, body.name),
      tempStatus: pickDefined(body.tempStatus, body.status),
      tempNoAsset: pickDefined(body.tempNoAsset, body.noAsset),
      tempSerialNo: pickDefined(body.tempSerialNo, body.serialNo),
      tempPic: pickDefined(body.tempPic, body.pic),
      tempBrand: pickDefined(body.tempBrand, body.brand),
      tempModel: pickDefined(body.tempModel, body.model),
      tempCost: parseCostInput(pickDefined(body.tempCost, body.cost)),
      tempNotes: pickDefined(body.tempNotes, body.notes),
      tempPurchaseDate: pickDefined(
        parseDateInput(body.tempPurchaseDate),
        parseDateInput(body.purchaseDate)
      ),
      tempSiteId: pickDefined(
        normalizeIdInput(body.tempSiteId),
        normalizeIdInput(body.siteId)
      ),
      tempCategoryId: pickDefined(
        normalizeIdInput(body.tempCategoryId),
        normalizeIdInput(body.categoryId)
      ),
      tempDepartmentId: pickDefined(
        normalizeIdInput(body.tempDepartmentId),
        normalizeIdInput(body.departmentId)
      ),
      tempPicId: pickDefined(
        normalizeIdInput(body.tempPicId),
        normalizeIdInput(body.picId)
      ),
      tempImageUrl:
        body.tempImageUrl !== undefined
          ? body.tempImageUrl || null
          : body.imageUrl !== undefined
          ? body.imageUrl || null
          : undefined,
      isIdentified: body.isIdentified !== undefined ? body.isIdentified : true,
    };

    if (body.isCrucial !== undefined) {
      updateData.isCrucial = Boolean(body.isCrucial);
      if (!updateData.isCrucial) {
        updateData.crucialNotes = null;
      }
    }

    if (body.crucialNotes !== undefined) {
      const note =
        typeof body.crucialNotes === "string" ? body.crucialNotes.trim() : "";
      updateData.crucialNotes = note || null;
    }

    console.log("DEBUG: Update data prepared:", updateData);

    const updatedEntry = await db.sOAssetEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        asset: {
          include: {
            site: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                email: true,
                department: true,
                position: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    // Fetch temp relations separately
    const tempSite = updatedEntry.tempSiteId
      ? await db.site.findUnique({
          where: { id: updatedEntry.tempSiteId },
          select: { id: true, name: true },
        })
      : null;
    const tempCategory = updatedEntry.tempCategoryId
      ? await db.category.findUnique({
          where: { id: updatedEntry.tempCategoryId },
          select: { id: true, name: true },
        })
      : null;
    const tempDepartment = updatedEntry.tempDepartmentId
      ? await db.department.findUnique({
          where: { id: updatedEntry.tempDepartmentId },
          select: { id: true, name: true },
        })
      : null;
    const tempPicEmployee = updatedEntry.tempPicId
      ? await db.employee.findUnique({
          where: { id: updatedEntry.tempPicId },
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            position: true,
            isActive: true,
          },
        })
      : null;

    const currentSnapshot = {
      tempName: existingEntry.tempName,
      tempStatus: existingEntry.tempStatus,
      tempSerialNo: existingEntry.tempSerialNo,
      tempPic: existingEntry.tempPic,
      tempBrand: existingEntry.tempBrand,
      tempModel: existingEntry.tempModel,
      tempCost: existingEntry.tempCost,
      tempNotes: existingEntry.tempNotes,
      isIdentified: existingEntry.isIdentified,
    };

    const updatedSnapshot = {
      tempName: updatedEntry.tempName,
      tempStatus: updatedEntry.tempStatus,
      tempSerialNo: updatedEntry.tempSerialNo,
      tempPic: updatedEntry.tempPic,
      tempBrand: updatedEntry.tempBrand,
      tempModel: updatedEntry.tempModel,
      tempCost: updatedEntry.tempCost,
      tempNotes: updatedEntry.tempNotes,
      isIdentified: updatedEntry.isIdentified,
    };

    // Transform response to match expected format
    const transformedEntry = {
      ...updatedEntry,
      soSessionId: updatedEntry.soSessionId,
      assetId: updatedEntry.assetId,
      scannedAt: updatedEntry.scannedAt,
      isIdentified: updatedEntry.isIdentified,
      isCrucial: updatedEntry.isCrucial,
      crucialNotes: updatedEntry.crucialNotes,
      tempName: updatedEntry.tempName,
      tempStatus: updatedEntry.tempStatus,
      tempSerialNo: updatedEntry.tempSerialNo,
      tempPic: updatedEntry.tempPic,
      tempPicId: updatedEntry.tempPicId,
      tempNotes: updatedEntry.tempNotes,
      tempBrand: updatedEntry.tempBrand,
      tempModel: updatedEntry.tempModel,
      tempCost: updatedEntry.tempCost,
      tempSiteId: updatedEntry.tempSiteId,
      tempCategoryId: updatedEntry.tempCategoryId,
      tempDepartmentId: updatedEntry.tempDepartmentId,
      tempSite: tempSite,
      tempCategory: tempCategory,
      tempDepartment: tempDepartment,
      tempPicEmployee: tempPicEmployee,
      createdAt: updatedEntry.createdAt,
      updatedAt: updatedEntry.updatedAt,
      // Include asset data with noAsset field
      asset: updatedEntry.asset
        ? {
            ...updatedEntry.asset,
            noAsset: updatedEntry.asset.noAsset, // Ensure noAsset field is included
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      message: "Entry updated successfully",
      entry: transformedEntry,
    });
  } catch (error) {
    console.error("Update SO entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
