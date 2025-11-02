import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface ImportAsset {
  NameOfAsset: string;
  NoAsset: string;
  Status?: string | null;
  SerialNo?: string | null;
  PurchaseDate?: string | null;
  Cost?: string | null;
  Brand?: string | null;
  Model?: string | null;
  Site?: string | null;
  Category?: string | null;
  Department?: string | null;
  PIC?: string | null;
}

const normalizeInput = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "?") return null;
  return trimmed;
};

const parseCost = (value: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/,/g, "");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: string | null) => {
  if (!value) return null;

  // Try YYYY-MM-DD format first
  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  // Try Indonesian date format (DD-MMM-YY)
  const indoDateMatch = value.match(/^(\d{2})-(\w{3})-(\d{2})$/);
  if (indoDateMatch) {
    const [, day, month, year] = indoDateMatch;

    const monthMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
      'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
    };

    const monthNum = monthMap[month];
    if (monthNum !== undefined) {
      const fullYear = parseInt(year) + (parseInt(year) >= 50 ? 1900 : 2000);
      const indoParsedDate = new Date(fullYear, monthNum, parseInt(day));
      if (!Number.isNaN(indoParsedDate.getTime())) {
        return indoParsedDate;
      }
    }
  }

  throw new Error(`Invalid date "${value}" (expected YYYY-MM-DD or DD-MMM-YY format)`);
};

const ensureReference = async (table: "categories" | "sites" | "departments", name: string) => {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from(table)
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    throw new Error(`Failed to lookup ${table}: ${fetchError.message}`);
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const newId = randomUUID();
  const { data: created, error: insertError } = await supabaseAdmin
    .from(table)
    .insert({ id: newId, name })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry } = await supabaseAdmin
        .from(table)
        .select("id")
        .eq("name", name)
        .maybeSingle();
      if (retry?.id) {
        return retry.id as string;
      }
    }
    throw new Error(`Failed to create ${table}: ${insertError.message}`);
  }

  return created?.id as string;
};

export async function POST(request: NextRequest) {
  try {
    const { assets } = await request.json();

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const rawAsset of assets as ImportAsset[]) {
      try {
        const name = normalizeInput(rawAsset.NameOfAsset);
        const noAsset = normalizeInput(rawAsset.NoAsset);

        if (!name || !noAsset) {
          results.skipped++;
          results.errors.push(
            `Missing required fields for asset "${rawAsset.NoAsset ?? "?"}"`
          );
          continue;
        }

        const status = normalizeInput(rawAsset.Status) ?? "Active";

        const serialNo = normalizeInput(rawAsset.SerialNo);
        const brand = normalizeInput(rawAsset.Brand);
        const model = normalizeInput(rawAsset.Model);
        const pic = normalizeInput(rawAsset.PIC);

        const categoryName = normalizeInput(rawAsset.Category);
        const siteName = normalizeInput(rawAsset.Site);
        const departmentName = normalizeInput(rawAsset.Department);

        const rawCost = normalizeInput(rawAsset.Cost);
        let costValue: number | null = null;
        if (rawCost) {
          const parsedCost = parseCost(rawCost);
          if (parsedCost === null) {
            throw new Error(`Invalid cost "${rawCost}" (expected numeric value)`);
          }
          costValue = parsedCost;
        }

        let purchaseDate: Date | null = null;
        const purchaseDateInput = normalizeInput(rawAsset.PurchaseDate);
        if (purchaseDateInput) {
          purchaseDate = parseDate(purchaseDateInput);
        }

        let categoryId: string | null = null;
        if (categoryName) {
          categoryId = await ensureReference("categories", categoryName);
        }

        let siteId: string | null = null;
        if (siteName) {
          siteId = await ensureReference("sites", siteName);
        }

        let departmentId: string | null = null;
        if (departmentName) {
          departmentId = await ensureReference("departments", departmentName);
        }

        const nowIso = new Date().toISOString();

        const { data: existingAsset, error: existingError } = await supabaseAdmin
          .from("assets")
          .select("id")
          .eq("no_asset", noAsset)
          .maybeSingle();

        if (existingError && existingError.code !== "PGRST116") {
          throw new Error(`Failed to verify asset: ${existingError.message}`);
        }

        if (existingAsset?.id) {
          results.skipped++;
          results.errors.push(`Asset number ${noAsset} already exists`);
          continue;
        }

        const assetId = randomUUID();
        const { error: insertError } = await supabaseAdmin.from("assets").insert({
          id: assetId,
          name,
          no_asset: noAsset,
          status,
          serial_no: serialNo,
          brand,
          model,
          pic,
          category_id: categoryId,
          site_id: siteId,
          department_id: departmentId,
          cost: costValue,
          purchase_date: purchaseDate ? purchaseDate.toISOString() : null,
          createdat: nowIso,
          updatedat: nowIso,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        results.imported++;
      } catch (error: any) {
        const identifier = normalizeInput(rawAsset.NoAsset) ?? "unknown";
        console.error(`Error importing asset ${identifier}:`, error);
        results.errors.push(
          `Failed to import ${identifier}: ${
            error?.message ?? "Unexpected error"
          }`
        );
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import assets", details: `${error}` },
      { status: 500 }
    );
  }
}
