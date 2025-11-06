import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const toRoman = (value: number): string => {
  if (value <= 0) return "I";
  const numerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remainder = value;
  let roman = "";

  for (const [amount, numeral] of numerals) {
    while (remainder >= amount) {
      roman += numeral;
      remainder -= amount;
    }
  }

  return roman || "I";
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const siteId = searchParams.get("siteId");

    const [categories, sites, assetCount] = await Promise.all([
      db.category.findMany({
        select: { id: true },
        orderBy: { name: "asc" }
      }),
      db.site.findMany({
        select: { id: true },
        orderBy: { name: "asc" }
      }),
      db.asset.count()
    ]);

    const nextNumber = assetCount + 1;
    const paddedNumber = nextNumber.toString().padStart(3, "0");

    let categoryRoman = "I";
    if (categoryId && Array.isArray(categories)) {
      const categoryIndex = categories.findIndex((category) => category.id === categoryId);
      if (categoryIndex >= 0) {
        categoryRoman = toRoman(categoryIndex + 1);
      }
    }

    let siteNumber = "01";
    if (siteId && Array.isArray(sites)) {
      const siteIndex = sites.findIndex((site) => site.id === siteId);
      if (siteIndex >= 0) {
        siteNumber = (siteIndex + 1).toString().padStart(2, "0");
      }
    }

    const assetNumber = `FA${paddedNumber}/${categoryRoman}/${siteNumber}`;

    return NextResponse.json({
      assetNumber: assetNumber,
      number: assetNumber, // For backward compatibility
      categoryRoman,
      siteNumber,
    });
  } catch (error: any) {
    console.error("Generate number error:", error);
    return NextResponse.json(
      { error: "Failed to generate asset number", details: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
