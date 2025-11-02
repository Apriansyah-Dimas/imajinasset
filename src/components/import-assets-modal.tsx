"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Upload, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors?: string[];
  message?: string;
};

interface ImportAssetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type AssetField =
  | "NameOfAsset"
  | "NoAsset"
  | "Status"
  | "SerialNo"
  | "PurchaseDate"
  | "Cost"
  | "Brand"
  | "Model"
  | "Site"
  | "Category"
  | "Department"
  | "PIC";

type ParsedAssetRow = Record<AssetField, string | null>;

const FIELD_ORDER: AssetField[] = [
  "NameOfAsset",
  "NoAsset",
  "Status",
  "SerialNo",
  "PurchaseDate",
  "Cost",
  "Brand",
  "Model",
  "Site",
  "Category",
  "Department",
  "PIC",
];

const SAMPLE_LINES = [
  "Laptop Lenovo ThinkPad,FA040.1/I/01,Active,TP123-9981,15-Agu-19,12000000,Lenovo,X1 Carbon,HQ,Electronics,Engineering,John Doe",
  "Desktop HP Elite,FA040.13/I/01,Broken,HP-33A-0298,?,8500000,HP,EliteDesk,Warehouse,IT,Operations,?",
  "Monitor Samsung,FA050.25/I/01,Active,SN-987654,11-Mei-15,2500000,Samsung,SyncMaster,HQ,Electronics,Operations,?",
].join("\n");

const normalizeValue = (value?: string): string | null => {
  if (value === undefined) return null;
  const cleaned = value.replace(/^"|"$/g, "").trim();
  if (!cleaned || cleaned === "?") return null;
  return cleaned;
};

const parseAssetsInput = (input: string) => {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: ParsedAssetRow[] = [];
  const issues: string[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const rawValues = line.split(",").map((segment) => segment.trim());

    if (rawValues.length < FIELD_ORDER.length) {
      issues.push(
        `Line ${lineNumber}: expected ${FIELD_ORDER.length} values separated by commas, received ${rawValues.length}`
      );
      return;
    }

    const row: ParsedAssetRow = Object.create(null);

    FIELD_ORDER.forEach((field, fieldIndex) => {
      row[field] = normalizeValue(rawValues[fieldIndex]);
    });

    let isValid = true;
    if (!row.NameOfAsset) {
      issues.push(`Line ${lineNumber}: Name (column 1) is required`);
      isValid = false;
    }
    if (!row.NoAsset) {
      issues.push(`Line ${lineNumber}: Asset number (column 2) is required`);
      isValid = false;
    }

    if (isValid) {
      rows.push(row);
    }
  });

  return { rows, issues };
};

export default function ImportAssetsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportAssetsModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsedData, setParsedData] = useState<{ rows: ParsedAssetRow[]; issues: string[] } | null>(null);
  const isReadyToImport =
    parsedData !== null && parsedData.rows.length > 0 && parsedData.issues.length === 0;

  const reset = () => {
    setInputValue("");
    setResult(null);
    setParsedData(null);
  };

  const closeModal = () => {
    onOpenChange(false);
    reset();
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_LINES], {
      type: "text/plain;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "asset-import-template.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const handleImport = async () => {
    if (!inputValue.trim()) {
      toast.error("Please provide at least one line to import.");
      return;
    }

    if (!parsedData || parsedData.rows.length === 0) {
      toast.error("No valid lines found. Please check your input.");
      return;
    }

    if (parsedData.issues.length > 0) {
      setResult({
        success: false,
        imported: 0,
        skipped: parsedData.rows.length,
        message: "Validation failed",
        errors: parsedData.issues,
      });
      toast.error("Please resolve the validation issues before importing.");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const payload = {
        assets: parsedData.rows.map((row) => ({
          NameOfAsset: row.NameOfAsset!,
          NoAsset: row.NoAsset!,
          Status: row.Status ?? "Active",
          SerialNo: row.SerialNo,
          PurchaseDate: row.PurchaseDate,
          Cost: row.Cost,
          Brand: row.Brand,
          Model: row.Model,
          Site: row.Site,
          Category: row.Category,
          Department: row.Department,
          PIC: row.PIC,
        })),
      };

      const response = await fetch("/api/assets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          imported: data.imported ?? 0,
          skipped: data.skipped ?? parsedData.rows.length,
          message: data.error ?? "Import failed",
          errors: data.errors ?? [],
        });
        toast.error(data.error ?? "Failed to import assets.");
        return;
      }

      setResult({
        success: Boolean(data.success),
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        message: data.message ?? "Import completed",
        errors: data.errors ?? [],
      });

      if (data.success) {
        toast.success("Assets imported successfully");
        setInputValue("");
        setParsedData(null);
        onSuccess();
      }
    } catch (error: any) {
      console.error("Asset import error:", error);
      setResult({
        success: false,
        imported: 0,
        skipped: rows.length,
        message: "Unexpected error during import",
        errors: [error?.message ?? "Unknown error"],
      });
      toast.error("Unexpected error during import.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <DialogTitle className="text-lg sm:text-xl">
              Import Assets
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Use plain text: one asset per line, commas between fields, and
              use <span className="font-semibold">?</span> for empty values.
              Supports decimal format like FA040.1, FA040.13.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="h-8 px-3 self-start"
          >
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
        </DialogHeader>

        <div className="rounded-md border border-yellow-200 bg-yellow-50 text-yellow-900 text-xs sm:text-sm p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Column order:</span>{" "}
              Name, NoAsset, Status, SerialNo, PurchaseDate, Cost, Brand,
              Model, Site, Category, Department, PIC.
            </div>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Each newline represents a single asset. Values are separated by
              commas.
            </li>
            <li>
              Use <code>?</code> to leave a field blank. Name and NoAsset are
              required.
            </li>
            <li>
              Optional: Status defaults to &ldquo;Active&rdquo; when omitted,
              Cost must be numeric, PurchaseDate uses YYYY-MM-DD or DD-MMM-YY (Indonesian format like 11-Mei-15).
            </li>
            <li>
              NoAsset supports decimal format like FA040.1, FA040.13, etc.
            </li>
          </ul>
        </div>

        <div className="border rounded-md min-w-0">
          <Textarea
            value={inputValue}
            onChange={(event) => {
              const text = event.target.value;
              setInputValue(text);
              setResult(null);
              if (text.trim()) {
                const parsed = parseAssetsInput(text);
                setParsedData(parsed);
              } else {
                setParsedData(null);
              }
            }}
            placeholder={SAMPLE_LINES}
            rows={10}
            className="font-mono text-xs sm:text-sm h-60 w-full overflow-auto resize-none"
          />
        </div>

        {inputValue.trim() !== "" && parsedData && (
          <div
            className={`p-3 border rounded ${
              parsedData.issues.length
                ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                : "bg-green-50 border-green-200 text-green-900"
            }`}
            aria-live="polite"
          >
            <div className="text-sm font-semibold">
              {parsedData.issues.length
                ? "Validation issues detected"
                : "All rows are valid"}
            </div>
            <div className="text-sm mt-1">
              • Ready rows: {parsedData.rows.length}
            </div>
            {parsedData.issues.length > 0 && (
              <div className="mt-2 space-y-1 text-sm">
                {parsedData.issues.slice(0, 5).map((issue, idx) => (
                  <div key={idx}>• {issue}</div>
                ))}
                {parsedData.issues.length > 5 && (
                  <div>• and {parsedData.issues.length - 5} more issue(s)</div>
                )}
              </div>
            )}
          </div>
        )}

        {result && (
          <div
            className={`p-3 border rounded ${
              result.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="text-sm text-gray-800">
                <div
                  className={`font-semibold ${
                    result.success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {result.message ||
                    (result.success ? "Import success" : "Import failed")}
                </div>
                <div className="mt-1 space-y-1">
                  <div>• Imported: {result.imported}</div>
                  <div>• Skipped: {result.skipped}</div>
                  {!!result.errors?.length && (
                    <div className="mt-2 space-y-1">
                      {result.errors.slice(0, 5).map((error, idx) => (
                        <div key={idx}>• {error}</div>
                      ))}
                      {result.errors.length > 5 && (
                        <div>
                          • and {result.errors.length - 5} more issue
                          {result.errors.length - 5 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={reset}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>
          <Button
            onClick={handleImport}
            disabled={uploading || !isReadyToImport}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto min-h-[44px]"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Validate & Import
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={closeModal}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
