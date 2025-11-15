"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SignaturePad from "@/components/signature-pad";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AssetRecord {
  id: string;
  name: string;
  noAsset: string;
  status: string;
  serialNo?: string | null;
  brand?: string | null;
  model?: string | null;
  pic?: string | null;
  picId?: string | null;
  notes?: string | null;
  site?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
}

interface PicOption {
  id: string;
  name: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface CheckoutHistoryEntry {
  id: string;
  checkoutDate: string;
  dueDate?: string | null;
  notes?: string | null;
  signatureData?: string | null;
  department?: { id: string; name: string } | null;
  assignTo: {
    id: string;
    name: string;
    employeeId?: string | null;
  };
  createdAt: string;
  asset?: { id: string; name: string; noAsset: string };
  status: "OUT" | "RETURNED";
  returnedAt?: string | null;
  returnNotes?: string | null;
  receivedBy?: {
    id: string;
    name: string;
    employeeId?: string | null;
  } | null;
}

interface CheckoutFormState {
  checkoutDate: string;
  assignTo: string;
  dueDate: string;
  departmentId: string;
  notes: string;
  signature: string | null;
}

interface CheckoutHistoryDetail extends CheckoutHistoryEntry {
  assignTo: CheckoutHistoryEntry["assignTo"] & { email?: string | null };
  asset?: { id: string; name: string; noAsset: string };
}

const formatDateTimeForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultFormData = (): CheckoutFormState => ({
  checkoutDate: formatDateTimeForInput(new Date()),
  assignTo: "",
  dueDate: "",
  departmentId: "",
  notes: "",
  signature: null,
});

const formatDisplayDateTime = (
  value?: string | null,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...options,
  });
};

const LAST_ASSET_STORAGE_KEY = "checkout:lastAssetState";

type StoredAssetState = {
  number: string;
  status: "verified" | "completed";
};

const parseStoredAssetState = (raw: string | null): StoredAssetState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAssetState | null;
    if (parsed?.number) {
      return {
        number: parsed.number,
        status: parsed.status === "completed" ? "completed" : "verified",
      };
    }
    return null;
  } catch {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return { number: trimmed, status: "verified" };
  }
};

function AssetInfo({
  label,
  value,
  subtle,
}: {
  label: string;
  value: ReactNode;
  subtle?: boolean;
}) {
  const baseClasses =
    "space-y-1 rounded-lg border border-border/60 p-3 " +
    (subtle ? "bg-muted/30" : "bg-muted/20");

  return (
    <div className={baseClasses}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value || "-"}</p>
    </div>
  );
}

function HistoryEntryCard({
  entry,
  fetchDetail,
}: {
  entry: CheckoutHistoryEntry;
  fetchDetail: (id: string) => Promise<CheckoutHistoryDetail | null>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CheckoutHistoryDetail | null>(null);

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (detail || loading) return;
    setLoading(true);
    const fetched = await fetchDetail(entry.id);
    if (fetched) {
      setDetail(fetched);
    }
    setLoading(false);
  };

  const effectiveDetail = detail ?? (entry as CheckoutHistoryDetail);

  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-foreground">
        <span>{formatDisplayDateTime(entry.checkoutDate)}</span>
        <div className="flex items-center gap-2">
          {entry.dueDate && (
            <span className="text-xs font-normal text-muted-foreground">
              Due {formatDisplayDateTime(entry.dueDate)}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              entry.status === "OUT"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            }`}
          >
            {entry.status === "OUT" ? "Belum kembali" : "Selesai"}
          </span>
        </div>
      </div>
      {entry.asset && (
        <p className="text-xs font-medium text-foreground">
          {entry.asset.noAsset} • {entry.asset.name}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Assign to{" "}
        <span className="font-medium text-foreground">
          {entry.assignTo.name}
        </span>
        {entry.department?.name ? ` • Dept ${entry.department.name}` : ""}
      </p>
      {entry.notes && (
        <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={handleToggle}
        >
          {open ? "Sembunyikan Detail" : "Lihat Detail"}
        </button>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-dashed bg-background/80 p-3 text-xs">
          {effectiveDetail.asset && (
            <div className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Asset Information
              </p>
              <p className="font-semibold text-foreground">
                {effectiveDetail.asset.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {effectiveDetail.asset.noAsset}
              </p>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <AssetInfo
              label="Check Out Date"
              value={formatDisplayDateTime(entry.checkoutDate)}
              subtle
            />
            <AssetInfo
              label="Due Date"
              value={entry.dueDate ? formatDisplayDateTime(entry.dueDate) : "-"}
              subtle
            />
            <AssetInfo
              label="Assign To"
              value={effectiveDetail.assignTo.name}
              subtle
            />
            <AssetInfo
              label="Department"
              value={effectiveDetail.department?.name ?? "-"}
              subtle
            />
          </div>
          {effectiveDetail.notes && (
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Notes
              </p>
              <p className="text-xs text-foreground">{effectiveDetail.notes}</p>
            </div>
          )}
          {effectiveDetail.status === "RETURNED" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <AssetInfo
                  label="Returned At"
                  value={formatDisplayDateTime(effectiveDetail.returnedAt)}
                  subtle
                />
                <AssetInfo
                  label="Received By"
                  value={effectiveDetail.receivedBy?.name ?? "-"}
                  subtle
                />
              </div>
              {effectiveDetail.returnNotes && (
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Return Notes
                  </p>
                  <p className="text-xs text-foreground">
                    {effectiveDetail.returnNotes}
                  </p>
                </div>
              )}
            </div>
          )}
          {effectiveDetail.signatureData && (
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Signature
              </p>
              <img
                src={effectiveDetail.signatureData}
                alt="Signature preview"
                className="mt-2 h-24 w-full rounded-md border bg-white object-contain p-2"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckOutContent() {
  const [assetNumber, setAssetNumber] = useState("");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetLookupLoading, setAssetLookupLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [pics, setPics] = useState<PicOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [picsLoading, setPicsLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [formData, setFormData] =
    useState<CheckoutFormState>(getDefaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<CheckoutHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFilterRange, setHistoryFilterRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [historyFilterApplied, setHistoryFilterApplied] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [pendingCheckout, setPendingCheckout] =
    useState<CheckoutHistoryEntry | null>(null);
  const autoLoadAttemptedRef = useRef(false);

  const loadHistory = useCallback(
    async (options?: { startDate?: string; endDate?: string }) => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (options?.startDate) {
          params.set("startDate", options.startDate);
        }
        if (options?.endDate) {
          params.set("endDate", options.endDate);
        }
        const query = params.toString();
        const response = await fetch(
          `/api/check-outs${query ? `?${query}` : ""}`,
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          const message =
            data?.error ?? "Gagal memuat history check out untuk asset ini.";
          setHistory([]);
          setHistoryError(message);
          return;
        }

        const payload = (await response.json()) as {
          history?: CheckoutHistoryEntry[];
        };
        setHistory(payload.history ?? []);
      } catch (error) {
        console.error("History fetch error:", error);
        setHistory([]);
        setHistoryError("Tidak dapat memuat history check out.");
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  const persistAssetState = useCallback((state: StoredAssetState | null) => {
    if (typeof window === "undefined") return;
    try {
      if (state) {
        window.localStorage.setItem(
          LAST_ASSET_STORAGE_KEY,
          JSON.stringify(state)
        );
      } else {
        window.localStorage.removeItem(LAST_ASSET_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleScrollToHistory = useCallback(() => {
    if (typeof window === "undefined") return;
    const element = document.getElementById("checkout-history");
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const checkOutstandingCheckout = useCallback(async (assetId: string) => {
    try {
      const response = await fetch(
        `/api/check-outs?assetId=${assetId}&limit=1`
      );
      if (!response.ok) {
        setPendingCheckout(null);
        return null;
      }
      const payload = (await response.json()) as {
        history?: CheckoutHistoryEntry[];
      };
      const latest = payload.history?.[0];
      if (latest && latest.status === "OUT") {
        setPendingCheckout(latest);
        return latest;
      }
      setPendingCheckout(null);
      return null;
    } catch (error) {
      console.error("Outstanding checkout check failed:", error);
      setPendingCheckout(null);
      return null;
    }
  }, []);

  const fetchAssetDetails = useCallback(
    async (
      number: string,
      options?: {
        openDetail?: boolean;
        showToastOnError?: boolean;
        statusOverride?: StoredAssetState["status"];
      }
    ) => {
      const trimmed = number.trim();
      if (!trimmed) return;
      setAssetError(null);
      setAssetLookupLoading(true);
      try {
        const query = encodeURIComponent(trimmed);
        const response = await fetch(`/api/assets/by-number?number=${query}`);

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          const message = data?.error ?? "Asset tidak ditemukan.";
          setAssetError(message);
          if (options?.showToastOnError ?? true) {
            toast.error(message);
          }
          persistAssetState(null);
          setSelectedAsset(null);
          setCheckoutCompleted(false);
          return;
        }

        const asset = (await response.json()) as AssetRecord;
        setSelectedAsset(asset);
        setAssetNumber(asset.noAsset);
        setDetailModalOpen(options?.openDetail ?? true);
        const status = options?.statusOverride ?? "verified";
        setCheckoutCompleted(status === "completed");
        persistAssetState({ number: asset.noAsset, status });
        await checkOutstandingCheckout(asset.id);
      } catch (error) {
        console.error("Asset lookup error:", error);
        const message = "Terjadi kesalahan saat mencari asset.";
        setAssetError(message);
        if (options?.showToastOnError ?? true) {
          toast.error(message);
        }
        persistAssetState(null);
        setSelectedAsset(null);
        setCheckoutCompleted(false);
        setPendingCheckout(null);
      } finally {
        setAssetLookupLoading(false);
      }
    },
    [persistAssetState, checkOutstandingCheckout]
  );

  const fetchHistoryDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/check-outs?id=${id}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Gagal memuat detail history");
      }
      const payload = (await response.json()) as {
        checkout?: CheckoutHistoryDetail;
      };
      return payload.checkout ?? null;
    } catch (error) {
      console.error("History detail fetch error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Tidak dapat memuat detail history."
      );
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchMasterData = async () => {
      setPicsLoading(true);
      setDepartmentsLoading(true);
      try {
        const [picsResponse, departmentsResponse] = await Promise.all([
          fetch("/api/pics"),
          fetch("/api/departments"),
        ]);

        if (picsResponse.ok) {
          const picData = (await picsResponse.json()) as PicOption[];
          setPics(picData);
        } else {
          toast.error("Gagal memuat daftar PIC.");
        }

        if (departmentsResponse.ok) {
          const departmentData =
            (await departmentsResponse.json()) as DepartmentOption[];
          setDepartments(departmentData);
        } else {
          toast.error("Gagal memuat daftar Department.");
        }
      } catch (error) {
        console.error("Master data fetch error:", error);
        toast.error(
          "Tidak dapat mengambil master data. Coba beberapa saat lagi."
        );
      } finally {
        setPicsLoading(false);
        setDepartmentsLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  useEffect(() => {
    if (autoLoadAttemptedRef.current) return;
    if (typeof window === "undefined") return;
    autoLoadAttemptedRef.current = true;
    try {
      const raw = window.localStorage.getItem(LAST_ASSET_STORAGE_KEY);
      const stored = parseStoredAssetState(raw);
      if (!stored) return;
      setAssetNumber(stored.number);
      setCheckoutCompleted(stored.status === "completed");
      fetchAssetDetails(stored.number, {
        openDetail: false,
        showToastOnError: false,
        statusOverride: stored.status,
      });
    } catch {
      // ignore storage errors
    }
  }, [fetchAssetDetails]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const buildDateParam = (value: string, endOfDay = false) => {
    if (!value) return undefined;
    const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
    const date = new Date(`${value}${suffix}`);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  };

  const handleApplyHistoryFilters = async () => {
    if (!historyFilterRange.startDate || !historyFilterRange.endDate) {
      toast.error("Isi tanggal mulai dan tanggal akhir.");
      return;
    }

    if (historyFilterRange.startDate > historyFilterRange.endDate) {
      toast.error("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    const startParam = buildDateParam(historyFilterRange.startDate, false);
    const endParam = buildDateParam(historyFilterRange.endDate, true);
    await loadHistory({ startDate: startParam, endDate: endParam });
    setHistoryFilterApplied(true);
  };

  const handleResetHistoryFilters = async () => {
    setHistoryFilterRange({ startDate: "", endDate: "" });
    setHistoryFilterApplied(false);
    await loadHistory();
  };

  const resetFlow = (options?: { clearAsset?: boolean }) => {
    const shouldClearAsset = options?.clearAsset ?? true;
    if (shouldClearAsset) {
      setSelectedAsset(null);
      setAssetNumber("");
      setCheckoutCompleted(false);
      setPendingCheckout(null);
      persistAssetState(null);
    }
    setDetailModalOpen(false);
    setCheckoutModalOpen(false);
    setFormData(getDefaultFormData());
    setSubmitting(false);
  };

  const handleVerifyAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetNumber.trim()) {
      setAssetError("Masukkan nomor asset terlebih dahulu.");
      return;
    }
    await fetchAssetDetails(assetNumber, {
      openDetail: true,
      showToastOnError: true,
      statusOverride: "verified",
    });
  };

  const handleDetailDialogChange = (open: boolean) => {
    setDetailModalOpen(open);
    if (!open && !checkoutModalOpen) {
      resetFlow();
    }
  };

  const handleCheckoutDialogChange = (open: boolean) => {
    setCheckoutModalOpen(open);
    if (!open) {
      resetFlow();
    }
  };

  const advanceToCheckoutForm = () => {
    setDetailModalOpen(false);
    setCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedAsset) return;
    if (!formData.assignTo) {
      toast.error("Assign To wajib dipilih.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/check-outs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          assignToId: formData.assignTo,
          checkoutDate: formData.checkoutDate,
          dueDate: formData.dueDate || null,
          departmentId: formData.departmentId || null,
          notes: formData.notes,
          signature: formData.signature,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Gagal menyimpan data check out.");
      }

      await loadHistory(selectedAsset.id);
      toast.success(`Asset ${selectedAsset.noAsset} berhasil di-check out.`);
      setCheckoutCompleted(true);
      persistAssetState({
        number: selectedAsset.noAsset,
        status: "completed",
      });
      await checkOutstandingCheckout(selectedAsset.id);
      setCheckoutModalOpen(false);
      setFormData(getDefaultFormData());
    } catch (error) {
      console.error("Check out submission error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Gagal memproses check out. Coba ulangi.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formFields = useMemo(
    () => [
      {
        label: "Check Out Date",
        input: (
          <div className="relative">
            <Input
              type="datetime-local"
              value={formData.checkoutDate}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  checkoutDate: event.target.value,
                }))
              }
              className="pr-10"
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        ),
      },
      {
        label: "Assign To*",
        input: (
          <Select
            value={formData.assignTo}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, assignTo: value }))
            }
            disabled={picsLoading || pics.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Person from PIC" />
            </SelectTrigger>
            <SelectContent>
              {pics.map((pic) => (
                <SelectItem key={pic.id} value={pic.id}>
                  {pic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
        helper:
          picsLoading && pics.length === 0
            ? "Memuat data PIC..."
            : pics.length === 0
            ? "Belum ada data PIC aktif."
            : undefined,
      },
      {
        label: "Due Date",
        input: (
          <div className="relative">
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  dueDate: event.target.value,
                }))
              }
              className="pr-10"
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        ),
      },
      {
        label: "Department",
        input: (
          <Select
            value={formData.departmentId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, departmentId: value }))
            }
            disabled={departmentsLoading || departments.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
        helper:
          departmentsLoading && departments.length === 0
            ? "Memuat department..."
            : departments.length === 0
            ? "Belum ada data department."
            : undefined,
      },
      {
        label: "Check Out Notes",
        input: (
          <Textarea
            rows={4}
            value={formData.notes}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Catatan tambahan mengenai proses check out."
          />
        ),
        alignTop: true,
      },
    ],
    [
      departments,
      departmentsLoading,
      formData.checkoutDate,
      formData.departmentId,
      formData.dueDate,
      formData.notes,
      formData.assignTo,
      pics,
      picsLoading,
    ]
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">Check Out</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan Asset No / No Asset untuk memulai proses check out.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Asset Verification
                </h2>
                <p className="text-sm text-muted-foreground">
                  Input nomor asset terlebih dahulu lalu klik Verify untuk
                  menampilkan detail asset secara otomatis.
                </p>
              </div>

              <form onSubmit={handleVerifyAsset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assetNumber">Asset No / No Asset</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="assetNumber"
                      placeholder="Masukkan nomor asset"
                      value={assetNumber}
                      onChange={(event) => setAssetNumber(event.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      className="w-full sm:w-40"
                      disabled={assetLookupLoading}
                    >
                      {assetLookupLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mencari
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {assetError && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {assetError}
                  </p>
                )}
              </form>

              <div className="space-y-4">
                {selectedAsset && !checkoutCompleted ? (
                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">
                      Asset Siap Diproses
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {selectedAsset.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAsset.noAsset}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {selectedAsset.category?.name && (
                        <span className="rounded-full bg-muted px-3 py-1">
                          {selectedAsset.category.name}
                        </span>
                      )}
                      {selectedAsset.department?.name && (
                        <span className="rounded-full bg-muted px-3 py-1">
                          {selectedAsset.department.name}
                        </span>
                      )}
                      {selectedAsset.site?.name && (
                        <span className="rounded-full bg-muted px-3 py-1">
                          {selectedAsset.site.name}
                        </span>
                      )}
                    </div>
                    {pendingCheckout && (
                      <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        Asset sedang dipinjam oleh{" "}
                        <span className="font-semibold">
                          {pendingCheckout.assignTo.name}
                        </span>{" "}
                        sejak{" "}
                        {formatDisplayDateTime(pendingCheckout.checkoutDate)}.
                        Selesaikan check-in terlebih dahulu sebelum melakukan
                        check out berikutnya.
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDetailModalOpen(true)}
                        className="flex-1"
                      >
                        Lihat Detail
                      </Button>
                      <Button
                        type="button"
                        onClick={advanceToCheckoutForm}
                        className="flex-1"
                        disabled={Boolean(pendingCheckout)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section
            id="checkout-history"
            className="rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    History Check Out
                  </h2>
                    {historyFilterApplied && (
                    <p className="text-xs text-muted-foreground">
                      Filter aktif: {historyFilterRange.startDate} →
                      {historyFilterRange.endDate}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-dashed"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {historyFilterApplied
                          ? `${historyFilterRange.startDate} → ${historyFilterRange.endDate}`
                          : "Filter Tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 space-y-3 rounded-2xl border bg-card p-4 shadow-lg">
                      <p className="text-sm font-semibold text-foreground">
                        Filter Tanggal
                      </p>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Tanggal Mulai
                          </Label>
                          <Input
                            type="date"
                            value={historyFilterRange.startDate}
                            onChange={(event) =>
                              setHistoryFilterRange((prev) => ({
                                ...prev,
                                startDate: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Tanggal Akhir
                          </Label>
                          <Input
                            type="date"
                            value={historyFilterRange.endDate}
                            onChange={(event) =>
                              setHistoryFilterRange((prev) => ({
                                ...prev,
                                endDate: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetHistoryFilters}
                          disabled={historyLoading}
                        >
                          Reset
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplyHistoryFilters}
                          disabled={historyLoading}
                        >
                          Terapkan
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {historyLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {historyError && (
              <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {historyError}
              </p>
            )}

            {!historyError && history.length === 0 && !historyLoading && (
              <p className="mt-4 text-sm text-muted-foreground">
                {historyFilterApplied
                  ? "Tidak ada data yang cocok dengan filter tanggal."
                  : "Belum ada data check out."}
              </p>
            )}

            {!historyError && history.length > 0 && (
              <div className="mt-4 space-y-3">
                {history.map((entry) => (
                  <HistoryEntryCard
                    key={entry.id}
                    entry={entry}
                    fetchDetail={fetchHistoryDetail}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedAsset) && detailModalOpen}
        onOpenChange={handleDetailDialogChange}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi Asset</DialogTitle>
            <DialogDescription>
              Pastikan detail asset berikut sesuai sebelum melanjutkan ke form
              check out. Data bersifat read-only.
            </DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AssetInfo label="Asset No" value={selectedAsset.noAsset} />
                <AssetInfo label="Nama Asset" value={selectedAsset.name} />
                <AssetInfo label="Status" value={selectedAsset.status} />
                <AssetInfo label="Serial No" value={selectedAsset.serialNo} />
                <AssetInfo
                  label="Category"
                  value={selectedAsset.category?.name ?? "-"}
                />
                <AssetInfo
                  label="Department"
                  value={selectedAsset.department?.name ?? "-"}
                />
                <AssetInfo
                  label="PIC"
                  value={selectedAsset.pic ?? selectedAsset.picId ?? "-"}
                />
                <AssetInfo label="Brand" value={selectedAsset.brand ?? "-"} />
                <AssetInfo label="Model" value={selectedAsset.model ?? "-"} />
                <AssetInfo
                  label="Site"
                  value={selectedAsset.site?.name ?? "-"}
                />
              </div>
              {selectedAsset.notes && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Notes
                  </p>
                  {selectedAsset.notes}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="justify-between gap-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={resetFlow}>
              Cancel
            </Button>
            <Button type="button" onClick={advanceToCheckoutForm}>
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={checkoutModalOpen}
        onOpenChange={handleCheckoutDialogChange}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Check Out Form</DialogTitle>
            <DialogDescription>
              Lengkapi informasi di bawah untuk menyelesaikan proses check out
              asset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {selectedAsset && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Asset</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedAsset.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedAsset.noAsset}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {formFields.map((field) => (
                <div
                  key={field.label}
                  className={`grid gap-3 sm:grid-cols-[160px_1fr] ${
                    field.alignTop ? "items-start" : "items-center"
                  }`}
                >
                  <Label className="text-sm text-muted-foreground">
                    {field.label}
                  </Label>
                  <div className="space-y-1">
                    {field.input}
                    {field.helper && (
                      <p className="text-xs text-muted-foreground">
                        {field.helper}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Label className="text-sm text-muted-foreground">Sign</Label>
                <SignaturePad
                  value={formData.signature}
                  onChange={(signature) =>
                    setFormData((prev) => ({ ...prev, signature }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="sm:w-32"
                onClick={resetFlow}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="sm:w-40"
                onClick={handleCheckoutSubmit}
                disabled={submitting || !formData.assignTo}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  "Check Out"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CheckOutPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
      <CheckOutContent />
    </ProtectedRoute>
  );
}
