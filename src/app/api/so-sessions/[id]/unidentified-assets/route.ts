import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerAuth } from "@/lib/server-auth";

const MAX_DB_RETRIES = 3;
const RETRY_DELAY_MS = 120;

const retryOnBusy = async <T>(operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = (error as Error)?.message?.toLowerCase() ?? "";
      const isBusy =
        message.includes("database is locked") ||
        message.includes("database is busy") ||
        message.includes("busy:");

      if (!isBusy || attempt === MAX_DB_RETRIES) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      );
    }
  }

  throw lastError;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const auth = await getServerAuth();
    console.log("[DEBUG API] Authentication check:", auth.isAuthenticated);

    if (!auth.isAuthenticated) {
      console.log("[DEBUG API] User not authenticated");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log(
      "[DEBUG API] User authenticated:",
      auth.user.email,
      "Role:",
      auth.user.role
    );

    const { id } = await params;
    console.log("[DEBUG API] Fetching unidentified assets for session ID:", id);

    // Validate session ID
    if (!id || typeof id !== "string") {
      console.log("[DEBUG API] Invalid session ID:", id);
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    // Get the SO session details
    console.log("[DEBUG API] Querying session from database...");
    let session;
    try {
      session = await retryOnBusy(() =>
        db.sOSession.findUnique({
          where: { id },
        })
      );
    } catch (dbError) {
      console.error(
        "[DEBUG API] Database error when fetching session:",
        dbError
      );
      return NextResponse.json(
        { error: "Database error when fetching session" },
        { status: 500 }
      );
    }

    console.log("[DEBUG API] Session found:", !!session);
    if (session) {
      console.log("[DEBUG API] Session name:", session.name);
      console.log("[DEBUG API] Session status:", session.status);
    }

    if (!session) {
      console.log("[DEBUG API] Session not found in database");
      return NextResponse.json(
        { error: "SO Session not found" },
        { status: 404 }
      );
    }

    // Get all assets from the database
    console.log("[DEBUG API] Fetching all assets from database...");
    let allAssets;
    try {
      allAssets = await retryOnBusy(() =>
        db.asset.findMany({
          include: {
            site: true,
            category: true,
            department: true,
          },
          orderBy: {
            noAsset: "asc",
          },
        })
      );
      console.log("[DEBUG API] Total assets found:", allAssets.length);
    } catch (dbError) {
      console.error(
        "[DEBUG API] Database error when fetching assets:",
        dbError
      );
      return NextResponse.json(
        { error: "Database error when fetching assets" },
        { status: 500 }
      );
    }

    // Get all scanned assets for this session
    console.log("[DEBUG API] Fetching scanned entries for session...");
    let scannedEntries;
    try {
      scannedEntries = await retryOnBusy(() =>
        db.sOAssetEntry.findMany({
          where: { soSessionId: id },
          include: {
            asset: {
              include: {
                site: true,
                category: true,
                department: true,
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
            tempSite: true,
            tempCategory: true,
            tempDepartment: true,
            tempPicEmployee: true,
          },
          orderBy: {
            scannedAt: "desc",
          },
        })
      );
    } catch (dbError) {
      console.error(
        "[DEBUG API] Database error when fetching scanned entries:",
        dbError
      );
      return NextResponse.json(
        { error: "Database error when fetching scanned entries" },
        { status: 500 }
      );
    }

    console.log("[DEBUG API] Scanned entries found:", scannedEntries.length);

    // Get scanned asset IDs
    const scannedAssetIds = scannedEntries.map((entry) => entry.assetId);

    // Find assets that haven't been scanned yet
    const missingAssets = allAssets.filter(
      (asset) => !scannedAssetIds.includes(asset.id)
    );

    console.log("[DEBUG API] Missing assets count:", missingAssets.length);

    // Get statistics
    const totalAssets = allAssets.length;
    const scannedAssets = scannedEntries.length;
    const missingCount = missingAssets.length;
    const identifiedCount = scannedEntries.filter(
      (entry) => entry.isIdentified
    ).length;
    const unidentifiedCount = scannedEntries.filter(
      (entry) => !entry.isIdentified
    ).length;

    // Group missing assets by site, category, and department for better analysis
    const missingBySite = missingAssets.reduce((acc, asset) => {
      const siteName = asset.site?.name || "Unknown Site";
      if (!acc[siteName]) {
        acc[siteName] = [];
      }
      acc[siteName].push(asset);
      return acc;
    }, {} as Record<string, typeof missingAssets>);

    const missingByCategory = missingAssets.reduce((acc, asset) => {
      const categoryName = asset.category?.name || "Unknown Category";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(asset);
      return acc;
    }, {} as Record<string, typeof missingAssets>);

    const missingByDepartment = missingAssets.reduce((acc, asset) => {
      const departmentName = asset.department?.name || "Unknown Department";
      if (!acc[departmentName]) {
        acc[departmentName] = [];
      }
      acc[departmentName].push(asset);
      return acc;
    }, {} as Record<string, typeof missingAssets>);

    const responseData = {
      session: {
        id: session.id,
        name: session.name,
        year: session.year,
        description: session.description,
        notes: session.notes,
        completionNotes: session.completionNotes,
        status: session.status,
        totalAssets: session.totalAssets,
        scannedAssets: session.scannedAssets,
        planStart: session.planStart,
        planEnd: session.planEnd,
      },
      statistics: {
        totalAssets,
        scannedAssets,
        missingAssets: missingCount,
        identifiedAssets: identifiedCount,
        unidentifiedAssets: unidentifiedCount,
        completionPercentage:
          totalAssets > 0 ? Math.round((scannedAssets / totalAssets) * 100) : 0,
        identificationPercentage:
          scannedAssets > 0
            ? Math.round((identifiedCount / scannedAssets) * 100)
            : 0,
      },
      missingAssets,
      groupedBy: {
        site: missingBySite,
        category: missingByCategory,
        department: missingByDepartment,
      },
      scannedEntries,
    };

    console.log("[DEBUG API] Preparing response with session data");
    console.log(
      "[DEBUG API] Response data size (approx):",
      JSON.stringify(responseData).length
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[DEBUG API] Error fetching missing assets:", error);
    console.error("[DEBUG API] Error type:", typeof error);
    console.error(
      "[DEBUG API] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    );
    console.error(
      "[DEBUG API] Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Failed to fetch missing assets" },
      { status: 500 }
    );
  }
}
