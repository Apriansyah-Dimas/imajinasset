import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.asset.findUnique({
      where: { id },
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
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Asset GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log("[DEBUG API] Assets PUT - Asset ID:", id);
    console.log(
      "[DEBUG API] Assets PUT - Request body:",
      JSON.stringify(body, null, 2)
    );

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Validate foreign key references if provided
    if (body.categoryId) {
      const categoryExists = await db.category.findUnique({
        where: { id: body.categoryId },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { error: "Selected category not found" },
          { status: 400 }
        );
      }
    }

    if (body.siteId) {
      const siteExists = await db.site.findUnique({
        where: { id: body.siteId },
      });
      if (!siteExists) {
        return NextResponse.json(
          { error: "Selected site not found" },
          { status: 400 }
        );
      }
    }

    if (body.departmentId) {
      const departmentExists = await db.department.findUnique({
        where: { id: body.departmentId },
      });
      if (!departmentExists) {
        return NextResponse.json(
          { error: "Selected department not found" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      name: body.name,
      noAsset: body.noAsset,
      status: body.status,
      serialNo: body.serialNo || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      cost: body.cost ? parseFloat(body.cost) : null,
      brand: body.brand || null,
      model: body.model || null,
      siteId: body.siteId || null,
      categoryId: body.categoryId || null,
      departmentId: body.departmentId || null,
    };

    console.log(
      "[DEBUG API] Assets PUT - Update data prepared:",
      JSON.stringify(updateData, null, 2)
    );

    // Handle PIC updates properly
    if (body.picId) {
      // Verify that the employee exists before setting picId
      const employeeExists = await db.employee.findUnique({
        where: { id: body.picId },
      });

      if (!employeeExists) {
        return NextResponse.json(
          { error: "Selected employee not found" },
          { status: 400 }
        );
      }

      // If picId is provided, use it and set pic to null
      updateData.picId = body.picId;
      updateData.pic = null;
    } else if (body.pic !== undefined && body.pic !== null && body.pic !== "") {
      // If pic (string) is provided, use it and set picId to null
      updateData.pic = body.pic;
      updateData.picId = null;
    } else {
      // Clear both if empty value provided
      updateData.pic = null;
      updateData.picId = null;
    }

    // Handle notes field (for additional information)
    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
      updateData.imageUrl = body.imageUrl ? body.imageUrl : null;
    }

    const asset = await db.asset.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error("Asset PUT error:", error);
    console.error("Error code:", error.code);
    console.error("Error meta:", error.meta);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Asset with this asset number already exists" },
        { status: 409 }
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (error.code === "P2003") {
      console.error("Foreign key violation details:", error.meta);
      return NextResponse.json(
        {
          error: "Invalid reference: selected item does not exist",
          details: error.meta?.field_name || "Unknown field",
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update asset",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await db.asset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Asset DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
