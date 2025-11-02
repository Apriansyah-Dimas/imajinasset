import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface ImportEmployeePayload {
  employeeId: string;
  name: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  joinDate?: string | null;
  rowNumber?: number;
}

interface EmployeeImportIssue {
  row: number;
  reason: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeInput = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "?") return null;
  return trimmed;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employees: ImportEmployeePayload[] = body?.employees;

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      issues: [] as EmployeeImportIssue[],
    };

    const processedIds = new Map<string, number>();

    for (let index = 0; index < employees.length; index++) {
      const employee = employees[index];
      const rowNumber = employee.rowNumber ?? index + 1;
      const rowIssues: string[] = [];

      const employeeId = normalizeInput(employee.employeeId);
      const name = normalizeInput(employee.name);
      const email = normalizeInput(employee.email);
      const department = normalizeInput(employee.department);
      const position = normalizeInput(employee.position);
      const joinDateValue = normalizeInput(employee.joinDate);

      if (!employeeId) rowIssues.push("Missing EmployeeID");
      if (!name) rowIssues.push("Missing Name");

      if (email && !EMAIL_REGEX.test(email)) {
        rowIssues.push(`Invalid email format "${email}"`);
      }

      let normalizedJoinDate: string | null = null;
      if (joinDateValue) {
        const parsed = new Date(joinDateValue);
        if (Number.isNaN(parsed.getTime())) {
          rowIssues.push(
            `Invalid JoinDate "${joinDateValue}" (expected YYYY-MM-DD)`
          );
        } else {
          normalizedJoinDate = parsed.toISOString();
        }
      }

      if (rowIssues.length) {
        results.skipped++;
        results.issues.push({
          row: rowNumber,
          reason: rowIssues.join("; "),
        });
        continue;
      }

      if (processedIds.has(employeeId!)) {
        const firstRow = processedIds.get(employeeId!)!;
        results.skipped++;
        results.issues.push({
          row: rowNumber,
          reason: `Duplicate EmployeeID within request (also found on row ${firstRow})`,
        });
        continue;
      }

      processedIds.set(employeeId!, rowNumber);

      try {
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from("employees")
          .select("id, name")
          .eq("employee_id", employeeId)
          .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
          results.skipped++;
          results.issues.push({
            row: rowNumber,
            reason: `Failed to verify existing employee: ${fetchError.message}`,
          });
          continue;
        }

        if (existing) {
          results.skipped++;
          results.issues.push({
            row: rowNumber,
            reason: `EmployeeID already exists${
              existing.name ? ` (current owner: ${existing.name})` : ""
            }`,
          });
          continue;
        }

        const nowIso = new Date().toISOString();
        const { error: insertError } = await supabaseAdmin
          .from("employees")
          .insert({
            id: randomUUID(),
            employee_id: employeeId,
            name,
            email: email || null,
            department: department || null,
            position: position || null,
            join_date: normalizedJoinDate,
            isactive: true,
            createdat: nowIso,
            updatedat: nowIso,
          });

        if (insertError) {
          results.skipped++;
          results.issues.push({
            row: rowNumber,
            reason: `Failed to create employee: ${insertError.message}`,
          });
          continue;
        }

        results.imported++;
      } catch (error: any) {
        console.error("Employee import row error:", error);
        results.skipped++;
        results.issues.push({
          row: rowNumber,
          reason: error?.message
            ? `Unexpected error: ${error.message}`
            : "Unexpected server error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      issues: results.issues,
      errors: results.issues.map(
        (issue) => `Row ${issue.row}: ${issue.reason}`
      ),
    });
  } catch (error) {
    console.error("Employee import error:", error);
    return NextResponse.json(
      { error: "Failed to import employees" },
      { status: 500 }
    );
  }
}
