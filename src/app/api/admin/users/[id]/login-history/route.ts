import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const showFailed = searchParams.get('showFailed') === 'true';

    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    if (!showFailed) {
      where.isSuccess = true;
    }

    const [history, total] = await Promise.all([
      db.loginHistory.findMany({
        where,
        orderBy: [
          { loginTime: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit,
      }),
      db.loginHistory.count({ where })
    ]);

    return NextResponse.json({
      history: history.map(entry => ({
        id: entry.id,
        loginTime: entry.loginTime.toISOString(),
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        browser: entry.browser,
        os: entry.os,
        device: entry.device,
        isSuccess: entry.isSuccess,
        failureReason: entry.failureReason,
        createdAt: entry.createdAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Failed to fetch login history:", error);
    return NextResponse.json(
      { error: "Failed to fetch login history" },
      { status: 500 }
    );
  }
}