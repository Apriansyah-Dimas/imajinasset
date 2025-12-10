import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, canManageUsers } from "@/lib/auth";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

const mapLog = (log: any) => {
  let parsedData: any = null;
  if (typeof log.data === "string") {
    try {
      parsedData = JSON.parse(log.data);
    } catch {
      parsedData = log.data;
    }
  } else if (log.data && typeof log.data === "object") {
    parsedData = log.data;
  }

  return {
    id: log.id,
    level: log.level,
    message: log.message,
    userId: log.userId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    action: parsedData?.action ?? null,
    entityType:
      parsedData?.entity_type ??
      parsedData?.entityType ??
      parsedData?.entity ??
      null,
    entityId: parsedData?.entity_id ?? parsedData?.entityId ?? null,
    data: parsedData,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Auth check
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Pagination & filters
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = { userId: id };

    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        where.createdAt = { ...(where.createdAt || {}), gte: parsed };
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        // Include end date full day
        const endOfDay = new Date(parsed);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt = { ...(where.createdAt || {}), lte: endOfDay };
      }
    }

    const [logs, total] = await Promise.all([
      db.log.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.log.count({ where }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    return NextResponse.json({
      logs: logs.map(mapLog),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch user logs" },
      { status: 500 }
    );
  }
}
