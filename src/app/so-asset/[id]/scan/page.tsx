"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import AssetDetailModal from "@/components/asset-detail-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getClientAuthToken } from "@/lib/client-auth";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  Filter,
  Search,
  Trash2,
  XCircle
} from "lucide-react";
import { AssetScanPanel } from "@/components/asset-scan-panel";

interface Asset {
  id: string;
  name: string;
  noAsset: string;
  status: string;
  serialNo?: string | null;
  brand?: string | null;
  model?: string | null;
  cost?: number | null;
  site?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  pic?: string | null;
  picId?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  employee?: {
    id: string;
    name: string;
    email?: string | null;
    department?: string | null;
    position?: string | null;
  } | null;
  dateCreated?: string;
}

interface ScannedEntry {
  id: string;
  assetId: string;
  soSessionId: string;
  scannedAt: string;
  status: string;
  isIdentified: boolean;
  tempName?: string | null;
  tempStatus?: string | null;
  tempSerialNo?: string | null;
  tempPic?: string | null;
  tempNotes?: string | null;
  tempBrand?: string | null;
  tempModel?: string | null;
  tempCost?: number | string | null;
  asset: Asset;
}

interface SessionOverview {
  id: string;
  name: string;
  year: number;
  status: string;
  totalAssets: number;
  scannedAssets: number;
}

interface UnidentifiedResponse {
  session: SessionOverview;
  missingAssets: Asset[];
  scannedEntries: ScannedEntry[];
}

const normalizeCostValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getEntryDisplayAsset = (entry: ScannedEntry): Asset => {
  const base = entry.asset;
  if (!base) {
    return {
      id: entry.assetId,
      name: entry.tempName || "Aset tanpa nama",
      noAsset: "-",
      status: entry.tempStatus || "Unidentified"
    } as Asset;
  }

  return {
    ...base,
    name: entry.tempName || base.name,
    status: entry.tempStatus || base.status,
    serialNo: entry.tempSerialNo ?? base.serialNo,
    pic: entry.tempPic ?? base.pic,
    brand: entry.tempBrand ?? base.brand,
    model: entry.tempModel ?? base.model,
    cost: normalizeCostValue(entry.tempCost ?? base.cost) ?? null,
    notes: entry.tempNotes ?? base.notes
  };
};

type ModalOptions = {
  readOnly?: boolean;
  startEdit?: boolean;
  entry?: ScannedEntry | null;
};

const filterChipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-semibold transition ${
    active
      ? "border-primary bg-primary/10 text-primary shadow-[0_6px_18px_rgba(62,82,160,0.18)]"
      : "border-surface-border text-text-muted hover:border-primary/40 hover:text-primary"
  }`;

const sortTileClass = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
    active
      ? "border-primary bg-primary/10 text-primary shadow-[0_6px_18px_rgba(62,82,160,0.18)]"
      : "border-surface-border text-text-muted hover:border-primary/40 hover:text-primary"
  }`;

const sortOptionsList: Array<{
  value: "name-asc" | "name-desc" | "created-newest" | "created-oldest";
  label: string;
  description: string;
}> = [
  { value: "name-asc", label: "Nama (A-Z)", description: "Urut berdasarkan nama aset" },
  { value: "name-desc", label: "Nama (Z-A)", description: "Nama aset dari Z ke A" },
  { value: "created-newest", label: "Terbaru", description: "Aset dengan tanggal dibuat terbaru" },
  { value: "created-oldest", label: "Terlama", description: "Aset paling lama dibuat" }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-[#ecfdf3] text-[#1a7f5a] border border-[#9ce8c4]";
    case "Broken":
      return "bg-[#fff5f5] text-[#c53030] border border-[#ffc9c9]";
    case "Maintenance Process":
      return "bg-[#fff8e6] text-[#b7791f] border border-[#ffe0a6]";
    case "Lost/Missing":
      return "bg-[#fff1ed] text-[#c2410c] border border-[#ffc9b0]";
    case "Sell":
      return "bg-[#eef4ff] text-[#314299] border border-[#c7d6ff]";
    default:
      return "bg-surface text-text-muted border border-surface-border";
  }
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

type FilterState = {
  status: string;
  category: string;
  site: string;
  department: string;
};
function ScanPageContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionOverview | null>(null);
  const [scannedEntries, setScannedEntries] = useState<ScannedEntry[]>([]);
  const [remainingAssets, setRemainingAssets] = useState<Asset[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    category: "all",
    site: "all",
    department: "all"
  });
  const [sortOption, setSortOption] =
    useState<"name-asc" | "name-desc" | "created-newest" | "created-oldest">(
      "name-asc"
    );
  const [activeList, setActiveList] = useState<"scanned" | "remaining">("scanned");

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ScannedEntry | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [pendingSessionAction, setPendingSessionAction] = useState<"cancel" | "complete" | "delete" | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const sessionActionDialog = {
    complete: {
      title: "Selesaikan sesi ini?",
      description: "Semua perubahan yang sudah kamu catat akan disinkronkan ke master asset setelah proses ini.",
      confirm: "Selesaikan Sesi",
      destructive: false
    },
    cancel: {
      title: "Batalkan sesi ini?",
      description: "Sesi akan dihentikan dan perubahan sementara tidak akan diterapkan.",
      confirm: "Batalkan Sesi",
      destructive: true
    },
    delete: {
      title: "Hapus sesi ini?",
      description: "Sesi dan seluruh data hasil scan akan dihapus permanen.",
      confirm: "Hapus Sesi",
      destructive: true
    }
  } as const;
  const actionDialogCopy =
    pendingSessionAction ? sessionActionDialog[pendingSessionAction] : sessionActionDialog.cancel;

  const combinedAssets = useMemo(
    () => [
      ...scannedEntries.map((entry) => getEntryDisplayAsset(entry)),
      ...remainingAssets
    ],
    [scannedEntries, remainingAssets]
  );
  const derivedScannedCount = scannedEntries.length;
  const derivedTotalAssets = derivedScannedCount + remainingAssets.length;
  const displayScannedCount = loadingData
    ? session?.scannedAssets ?? derivedScannedCount
    : derivedScannedCount;
  const displayTotalAssets = loadingData
    ? session?.totalAssets ?? derivedTotalAssets
    : derivedTotalAssets;

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(combinedAssets.map((asset) => asset.status).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [combinedAssets]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          combinedAssets
            .map((asset) => asset.category?.name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [combinedAssets]
  );

  const siteOptions = useMemo(
    () =>
      Array.from(
        new Set(
          combinedAssets
            .map((asset) => asset.site?.name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [combinedAssets]
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          combinedAssets
            .map((asset) => asset.department?.name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [combinedAssets]
  );

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.site !== "all" ||
    filters.department !== "all";
  const showActiveFilterDot = hasActiveFilters || sortOption !== "name-asc";
  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return;
    setLoadingData(true);
    try {
      const response = await fetch(
        `/api/so-sessions/${sessionId}/unidentified-assets`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch session data");
      }
      const data: UnidentifiedResponse = await response.json();
      setSession(data.session);
      setScannedEntries(data.scannedEntries || []);
      setRemainingAssets(data.missingAssets || []);
    } catch (error) {
      console.error("Failed to load session overview:", error);
      toast.error("Gagal memuat data sesi");
    } finally {
      setLoadingData(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const handleFilterChange = (type: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  const resetFiltersAndSort = () => {
    setFilters({ status: "all", category: "all", site: "all" });
    setSortOption("name-asc");
  };

  const matchesSearch = (asset: Asset, query: string) => {
    if (!query.trim()) return true;
    const normalized = query.trim().toLowerCase();
    const fields = [
      asset.name,
      asset.noAsset,
      asset.status,
      asset.serialNo,
      asset.brand,
      asset.model,
      asset.pic,
      asset.site?.name,
      asset.category?.name,
      asset.department?.name
    ]
      .filter(Boolean)
      .map((field) => String(field).toLowerCase());
    return fields.some((field) => field.includes(normalized));
  };

  const matchesFilters = (asset: Asset) => {
    if (filters.status !== "all" && asset.status !== filters.status) return false;
    if (filters.category !== "all" && asset.category?.name !== filters.category)
      return false;
    if (filters.site !== "all" && asset.site?.name !== filters.site) return false;
    if (filters.department !== "all" && asset.department?.name !== filters.department)
      return false;
    return true;
  };

  const sortRows = <T extends { asset: Asset }>(rows: T[]) => {
    return [...rows].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.asset.name.localeCompare(b.asset.name);
        case "name-desc":
          return b.asset.name.localeCompare(a.asset.name);
        case "created-newest":
          return (
            new Date(b.asset.dateCreated || b.asset.id).getTime() -
            new Date(a.asset.dateCreated || a.asset.id).getTime()
          );
        case "created-oldest":
          return (
            new Date(a.asset.dateCreated || a.asset.id).getTime() -
            new Date(b.asset.dateCreated || b.asset.id).getTime()
          );
        default:
          return 0;
      }
    });
  };
  const filteredScannedEntries = useMemo(() => {
    const rows = scannedEntries
      .map((entry) => {
        const assetData = getEntryDisplayAsset(entry);
        return { ...entry, asset: assetData };
      })
      .filter((entry) => entry.asset && matchesFilters(entry.asset) && matchesSearch(entry.asset, searchQuery));
    return sortRows(rows);
  }, [scannedEntries, filters, searchQuery, sortOption]);

  const filteredRemainingAssets = useMemo(() => {
    const rows = remainingAssets
      .filter((asset) => matchesFilters(asset) && matchesSearch(asset, searchQuery))
      .map((asset) => ({ asset }));
    return sortRows(rows);
  }, [remainingAssets, filters, searchQuery, sortOption]);

  const handleAssetSelection = useCallback(
    async (value: string, source: "camera" | "manual") => {
      const trimmed = value.trim();
      if (!trimmed) {
        toast.warning("Nomor aset kosong");
        return;
      }

      try {
        const token = getClientAuthToken();

        const response = await fetch(`/api/so-sessions/${sessionId}/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ assetNumber: trimmed, source })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Gagal memproses scan");
        }

        const data = await response.json();
        if (data.alreadyScanned) {
          toast.info("Aset ini sudah tercatat di sesi ini");
        } else {
          toast.success("Aset berhasil ditambahkan ke sesi");
        }

        if (data.entry) {
          openAssetModal(data.entry.asset ?? null, { startEdit: true, entry: data.entry });
        } else if (data.asset) {
          openAssetModal(data.asset, { startEdit: true });
        }

        fetchSessionData();
      } catch (error) {
        console.error("Scan error:", error);
        toast.error(
          error instanceof Error ? error.message : "Gagal memproses scan"
        );
      }
    },
    [sessionId, fetchSessionData]
  );

  const handleSessionAction = async () => {
    if (!sessionId || !pendingSessionAction) return;
    setSessionActionLoading(true);
    try {
      const token = getClientAuthToken();
      if (!token) {
        throw new Error("Sesi login berakhir, silakan login ulang.");
      }

      const endpointMap = {
        complete: `/api/so-sessions/${sessionId}/complete`,
        cancel: `/api/so-sessions/${sessionId}/cancel`,
        delete: `/api/so-sessions/${sessionId}/delete`
      } as const;

      const successMessageMap = {
        complete: "Sesi berhasil diselesaikan",
        cancel: "Sesi berhasil dibatalkan",
        delete: "Sesi berhasil dihapus"
      } as const;

      const endpoint = endpointMap[pendingSessionAction];

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal memproses sesi");
      }

      toast.success(successMessageMap[pendingSessionAction]);
      if (pendingSessionAction === "delete") {
        router.push("/so-asset");
        return;
      }
      fetchSessionData();
    } catch (error) {
      console.error("Session action error:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memproses aksi sesi"
      );
    } finally {
      setSessionActionLoading(false);
      setPendingSessionAction(null);
    }
  };
  const openAssetModal = (asset: Asset | null, options?: ModalOptions) => {
    const readOnly = !!options?.readOnly;
    const startEdit = !!options?.startEdit && !readOnly;
    const entry = options?.entry ?? null;
    const derivedAsset = entry ? getEntryDisplayAsset(entry) : asset;

    setModalReadOnly(readOnly);
    setStartInEditMode(startEdit);
    setSelectedEntry(entry);
    setSelectedAsset(derivedAsset || asset || null);
    setShowAssetModal(true);
  };

  const closeAssetModal = (open: boolean) => {
    setShowAssetModal(open);
    if (!open) {
      setStartInEditMode(false);
      setModalReadOnly(false);
      setSelectedAsset(null);
      setSelectedEntry(null);
    }
  };

  const emptyState = (
    <div className="surface-card border border-dashed border-surface-border/80 py-10 text-center text-sm text-text-muted">
      <AlertCircle className="mx-auto mb-3 h-5 w-5 text-primary" />
      <p>Tidak ada aset yang sesuai dengan pencarian</p>
    </div>
  );
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/so-asset")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <Badge
              variant={
                session?.status === "Active" ? "default" : "secondary"
              }
              className="text-xs"
            >
              {session?.status || "Loading"}
            </Badge>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {session?.name || "Memuat sesi..."}
              </h1>
              {session?.year ? (
                <span className="text-sm text-text-muted">
                  Tahun {session.year}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-text-muted">
              Lakukan scanning barcode atau input manual untuk mencatat aset dalam sesi ini. Setiap scan akan membuka form edit aset yang sama dengan halaman utama Assets.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <AssetScanPanel
            onDetected={handleAssetSelection}
            description="Lakukan scan barcode atau input manual untuk mencatat aset dalam sesi ini."
            manualPlaceholder="Masukkan nomor aset (contoh: FA001/I/01)"
            manualHelperText="Gunakan input manual jika barcode sulit terbaca kamera."
          />
          <div className="space-y-4">
            <Card className="surface-card border border-surface-border/70 shadow-none">
              <CardContent className="space-y-4 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Cari aset (nama, nomor aset, PIC, status, dsb)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="sneat-input h-12 w-full pl-12 text-sm"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Filter dan urutkan aset"
                        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-background text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                      >
                        <Filter className="h-4 w-4" />
                        <span className="sr-only">Filter & Sort</span>
                        {showActiveFilterDot ? (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                        ) : null}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0">
                      <div className="space-y-4 p-3">
                        <div className="flex items-center justify-between">
                          <DropdownMenuLabel className="p-0 text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">
                            Filter & Sort
                          </DropdownMenuLabel>
                          {showActiveFilterDot ? (
                            <button
                              type="button"
                              onClick={resetFiltersAndSort}
                              className="text-[0.7rem] font-semibold text-primary hover:text-primary/80"
                            >
                              Reset
                            </button>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-[0.65rem] uppercase text-text-muted">
                            Filter status
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {["all", ...statusOptions].map((status) => (
                              <button
                                key={status || "all-status"}
                                type="button"
                                onClick={() =>
                                  handleFilterChange("status", status || "all")
                                }
                                className={filterChipClass(
                                  filters.status === (status || "all")
                                )}
                              >
                                {status === "all" ? "Semua status" : status}
                              </button>
                            ))}
                          </div>
                        </div>

                        {categoryOptions.length > 0 && (
                          <div>
                            <p className="text-[0.65rem] uppercase text-text-muted">
                              Filter kategori
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {["all", ...categoryOptions].map((category) => (
                                <button
                                  key={category || "all-category"}
                                  type="button"
                                  onClick={() =>
                                    handleFilterChange(
                                      "category",
                                      category || "all"
                                    )
                                  }
                                  className={filterChipClass(
                                    filters.category === (category || "all")
                                  )}
                                >
                                  {category === "all"
                                    ? "Semua kategori"
                                    : category}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {siteOptions.length > 0 && (
                          <div>
                            <p className="text-[0.65rem] uppercase text-text-muted">
                              Filter lokasi
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {["all", ...siteOptions].map((site) => (
                                <button
                                  key={site || "all-site"}
                                  type="button"
                                  onClick={() =>
                                    handleFilterChange("site", site || "all")
                                  }
                                  className={filterChipClass(
                                    filters.site === (site || "all")
                                  )}
                                >
                                  {site === "all" ? "Semua lokasi" : site}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {departmentOptions.length > 0 && (
                          <div>
                            <p className="text-[0.65rem] uppercase text-text-muted">
                              Filter department
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {["all", ...departmentOptions].map((dept) => (
                                <button
                                  key={dept || "all-department"}
                                  type="button"
                                  onClick={() =>
                                    handleFilterChange("department", dept || "all")
                                  }
                                  className={filterChipClass(
                                    filters.department === (dept || "all")
                                  )}
                                >
                                  {dept === "all" ? "Semua department" : dept}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-[0.65rem] uppercase text-text-muted">
                            Urutkan
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {sortOptionsList.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSortOption(option.value)}
                                className={sortTileClass(
                                  sortOption === option.value
                                )}
                              >
                                <span className="text-[0.75rem]">
                                  {option.label}
                                </span>
                                <p className="mt-1 text-[0.65rem] font-normal text-text-muted">
                                  {option.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="mt-0" />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Tabs
                  value={activeList}
                  onValueChange={(value) =>
                    setActiveList(value as "scanned" | "remaining")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-surface">
                    <TabsTrigger value="scanned" className="rounded-xl">
                      Scanned ({filteredScannedEntries.length})
                    </TabsTrigger>
                    <TabsTrigger value="remaining" className="rounded-xl">
                      Remaining ({filteredRemainingAssets.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                  {loadingData ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-20 rounded-2xl bg-surface-border/40 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : activeList === "scanned" ? (
                    filteredScannedEntries.length === 0 ? (
                      emptyState
                    ) : (
                      filteredScannedEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-surface-border/80 bg-surface p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-foreground">
                                  {entry.asset?.name}
                                </h3>
                                <Badge
                                  className={`text-[0.65rem] ${getStatusColor(
                                    entry.asset?.status || ""
                                  )}`}
                                >
                                  {entry.asset?.status}
                                </Badge>
                              </div>
                              <p className="font-mono text-xs text-primary">
                                {entry.asset?.noAsset}
                              </p>
                              <p className="text-[0.65rem] uppercase text-text-muted">
                                Discan pada {formatDate(entry.scannedAt)}
                              </p>
                              <div className="text-xs text-text-muted">
                                <span className="mr-4">
                                  {entry.asset?.site?.name || "Lokasi tidak ada"}
                                </span>
                                <span>{entry.asset?.category?.name || "Kategori tidak ada"}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAssetModal(entry.asset, { startEdit: true, entry })}
                                className="justify-center"
                              >
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                Edit Asset
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  ) : filteredRemainingAssets.length === 0 ? (
                    emptyState
                  ) : (
                    filteredRemainingAssets.map(({ asset }) => (
                      <div
                        key={asset.id}
                        className="rounded-2xl border border-dashed border-surface-border bg-surface/40 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {asset.name}
                            </h3>
                            <p className="font-mono text-xs text-primary">
                              {asset.noAsset}
                            </p>
                            <p className="text-[0.65rem] text-text-muted">
                              {asset.site?.name || "Lokasi belum diatur"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssetModal(asset, { readOnly: true })}
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Detail asset
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            {session?.status === "Active" && (
              <div className="rounded-2xl border border-surface-border/70 bg-surface/70 p-5 shadow-sm sm:flex sm:items-center">
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="h-11 w-full justify-center sm:flex-1"
                    onClick={() => setPendingSessionAction("delete")}
                    disabled={sessionActionLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full justify-center border-destructive/60 text-destructive hover:bg-destructive/10 sm:flex-1"
                    onClick={() => setPendingSessionAction("cancel")}
                    disabled={sessionActionLoading}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 w-full justify-center bg-primary text-white hover:bg-primary/90 sm:flex-[2]"
                    onClick={() => setPendingSessionAction("complete")}
                    disabled={sessionActionLoading}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingSessionAction)}
        onOpenChange={(open) => {
          if (!open && !sessionActionLoading) {
            setPendingSessionAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionDialogCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{actionDialogCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sessionActionLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSessionAction}
              disabled={sessionActionLoading}
              className={
                actionDialogCopy.destructive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-primary text-white hover:bg-primary/90"
              }
            >
              {sessionActionLoading ? "Memproses..." : actionDialogCopy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssetDetailModal
        asset={selectedAsset}
        open={showAssetModal}
        onOpenChange={closeAssetModal}
        onUpdate={fetchSessionData}
        startInEditMode={startInEditMode}
        forceReadOnly={modalReadOnly}
        sessionContext={
          selectedEntry
            ? { sessionId: selectedEntry.soSessionId, entryId: selectedEntry.id }
            : undefined
        }
      />

    </div>
  );
}

export default function ScanPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER"]}>
      <ScanPageContent />
    </ProtectedRoute>
  );
}
