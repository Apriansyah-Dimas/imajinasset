"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import AssetDetailModal from "@/components/asset-detail-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getClientAuthToken } from "@/lib/client-auth";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { AssetScanPanel } from "@/components/asset-scan-panel";
import { Textarea } from "@/components/ui/textarea";

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
  purchaseDate?: string | null;
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
  isCrucial?: boolean;
  crucialNotes?: string | null;
  tempName?: string | null;
  tempStatus?: string | null;
  tempNoAsset?: string | null;
  tempSerialNo?: string | null;
  tempPic?: string | null;
  tempNotes?: string | null;
  tempBrand?: string | null;
  tempModel?: string | null;
  tempCost?: number | string | null;
  tempPurchaseDate?: string | null;
  tempImageUrl?: string | null;
  tempSiteId?: string | null;
  tempCategoryId?: string | null;
  tempDepartmentId?: string | null;
  tempPicId?: string | null;
  tempSite?: { id: string; name: string } | null;
  tempCategory?: { id: string; name: string } | null;
  tempDepartment?: { id: string; name: string } | null;
  tempPicEmployee?: {
    id: string;
    employeeId?: string | null;
    name: string;
    email?: string | null;
    department?: string | null;
    position?: string | null;
    isActive?: boolean | null;
  } | null;
  asset: Asset;
}

interface SessionOverview {
  id: string;
  name: string;
  year: number;
  status: string;
  totalAssets: number;
  scannedAssets: number;
  planStart?: string | null;
  planEnd?: string | null;
  description?: string | null;
  notes?: string | null;
  completionNotes?: string | null;
}

interface UnidentifiedResponse {
  session: SessionOverview;
  missingAssets: Asset[];
  scannedEntries: ScannedEntry[];
}

const normalizeCostValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getEntryDisplayAsset = (entry: ScannedEntry): Asset => {
  const base = entry.asset;
  if (!base) {
    return {
      id: entry.assetId,
      name: entry.tempName || "Unnamed asset",
      noAsset: entry.tempNoAsset || "-",
      status: entry.tempStatus || "Unidentified",
    } as Asset;
  }

  const basePicName = base.pic ?? base.employee?.name ?? null;
  const basePicId = base.picId ?? base.employee?.id ?? null;
  return {
    ...base,
    name: entry.tempName || base.name,
    noAsset: entry.tempNoAsset || base.noAsset,
    status: entry.tempStatus || base.status,
    serialNo: entry.tempSerialNo ?? base.serialNo,
    pic: entry.tempPic ?? entry.tempPicEmployee?.name ?? basePicName,
    picId: entry.tempPicId ?? entry.tempPicEmployee?.id ?? basePicId,
    brand: entry.tempBrand ?? base.brand,
    model: entry.tempModel ?? base.model,
    cost: normalizeCostValue(entry.tempCost ?? base.cost) ?? null,
    notes: entry.tempNotes ?? base.notes,
    purchaseDate: entry.tempPurchaseDate ?? base.purchaseDate ?? null,
    site: entry.tempSite ?? base.site ?? null,
    category: entry.tempCategory ?? base.category ?? null,
    department: entry.tempDepartment ?? base.department ?? null,
    imageUrl: entry.tempImageUrl ?? base.imageUrl ?? null,
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
  value:
    | "name-asc"
    | "name-desc"
    | "purchase-newest"
    | "purchase-oldest"
    | "asset-number-asc"
    | "asset-number-desc";
  label: string;
  description: string;
}> = [
  { value: "name-asc", label: "Name (A-Z)", description: "Sort by asset name" },
  { value: "name-desc", label: "Name (Z-A)", description: "Asset name Z-A" },
  {
    value: "purchase-newest",
    label: "Newest purchase",
    description: "Latest purchase date",
  },
  {
    value: "purchase-oldest",
    label: "Oldest purchase",
    description: "Earliest purchase date",
  },
  {
    value: "asset-number-asc",
    label: "Asset number (A-Z)",
    description: "Sort by asset code",
  },
  {
    value: "asset-number-desc",
    label: "Asset number (Z-A)",
    description: "Asset code descending",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-[#ecfdf3] text-[#1a7f5a] border border-[#9ce8c4]"; // Hijau segar
    case "Missing":
      return "bg-[#fff1ed] text-[#c2410c] border border-[#ffc9b0]"; // Oranye terang
    case "Lost":
      return "bg-[#fff1ed] text-[#c2410c] border border-[#ffc9b0]"; // Oranye terang (sama dengan Missing)
    case "Lost/Missing":
      return "bg-[#fff1ed] text-[#c2410c] border border-[#ffc9b0]"; // Oranye terang
    case "Broken":
      return "bg-[#fff5f5] text-[#c53030] border border-[#ffc9c9]"; // Merah cerah
    case "Sell":
      return "bg-[#eef4ff] text-[#314299] border border-[#c7d6ff]"; // Biru langit
    case "Sold":
      return "bg-[#eef4ff] text-[#314299] border border-[#c7d6ff]"; // Biru langit (sama dengan Sell)
    case "Pending":
      return "bg-[#fefce8] text-[#ca8a04] border border-[#fde047]"; // Kuning cerah
    case "Maintenance Process":
      return "bg-[#fff8e6] text-[#b7791f] border border-[#ffe0a6]"; // Kuning keemasan
    default:
      return "bg-surface text-text-muted border border-surface-border"; // Default abu-abu
  }
};

const formatPlanDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch (error) {
    console.warn("[DEBUG] Failed to parse JSON response", error);
    return null;
  }
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
  const { user } = useAuth();
  const canManageSession = user?.role === "ADMIN";
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionOverview | null>(null);
  const [scannedEntries, setScannedEntries] = useState<ScannedEntry[]>([]);
  const [remainingAssets, setRemainingAssets] = useState<Asset[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sessionNotes, setSessionNotes] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionNotesError, setCompletionNotesError] = useState<
    string | null
  >(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    category: "all",
    site: "all",
    department: "all",
  });
  const [sortOption, setSortOption] = useState<
    | "name-asc"
    | "name-desc"
    | "purchase-newest"
    | "purchase-oldest"
    | "asset-number-asc"
    | "asset-number-desc"
  >("name-asc");
  const [activeList, setActiveList] = useState<
    "scanned" | "remaining" | "crucial"
  >("scanned");

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ScannedEntry | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [pendingSessionAction, setPendingSessionAction] = useState<
    "cancel" | "complete" | "delete" | null
  >(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const sessionActionDialog = {
    complete: {
      title: "Complete this session?",
      description:
        "All captured changes will sync to master assets. Add completion notes before continuing.",
      confirm: "Complete Session",
      destructive: false,
    },
    cancel: {
      title: "Cancel this session?",
      description:
        "This session will stop and temporary changes will not be applied.",
      confirm: "Cancel Session",
      destructive: true,
    },
    delete: {
      title: "Delete this session?",
      description:
        "This session and all scan data will be permanently deleted.",
      confirm: "Delete Session",
      destructive: true,
    },
  } as const;
  const actionDialogCopy = pendingSessionAction
    ? sessionActionDialog[pendingSessionAction]
    : sessionActionDialog.cancel;

  const combinedAssets = useMemo(
    () => [
      ...scannedEntries.map((entry) => getEntryDisplayAsset(entry)),
      ...remainingAssets,
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
  const remainingCount = Math.max(displayTotalAssets - displayScannedCount, 0);
  const progressPercent =
    displayTotalAssets > 0
      ? Math.min(
          100,
          Math.round((displayScannedCount / displayTotalAssets) * 100)
        )
      : 0;

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(combinedAssets.map((asset) => asset.status).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
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
  const hasNotesChanged = notesDraft !== sessionNotes;
  const encodedSessionId = encodeURIComponent(sessionId);
  const fetchSessionData = useCallback(async () => {
    if (!sessionId) {
      console.log("[DEBUG] No sessionId provided, returning early");
      return;
    }

    console.log("[DEBUG] Starting fetchSessionData for sessionId:", sessionId);
    setLoadingData(true);

    try {
      // Check if we're in browser environment
      if (typeof window === "undefined") {
        console.log("[DEBUG] Not in browser environment, skipping fetch");
        return;
      }

      const token = getClientAuthToken();
      console.log("[DEBUG] Auth token present:", !!token);
      console.log("[DEBUG] Token length:", token?.length || 0);

      const baseUrl = window.location.origin;
      const apiUrl = `${baseUrl}/api/so-sessions/${encodedSessionId}/unidentified-assets`;
      console.log("[DEBUG] Fetching from URL:", apiUrl);
      console.log("[DEBUG] Encoded sessionId:", encodedSessionId);

      // Add more detailed fetch logging
      console.log("[DEBUG] About to make fetch request...");
      const fetchStart = Date.now();

      const response = await fetch(apiUrl, {
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const fetchDuration = Date.now() - fetchStart;
      console.log("[DEBUG] Fetch completed in:", fetchDuration, "ms");
      console.log("[DEBUG] Response status:", response.status);
      console.log("[DEBUG] Response ok:", response.ok);
      console.log(
        "[DEBUG] Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        console.log("[DEBUG] Response not OK, parsing error...");
        const errorData = (await parseJsonSafe(response)) || {};
        console.log("[DEBUG] Error response data:", errorData);
        const message =
          errorData.error ||
          `Failed to fetch session data (status ${response.status})`;
        console.log("[DEBUG] Throwing error:", message);
        throw new Error(message);
      }

      console.log("[DEBUG] Response OK, parsing JSON...");
      const data = (await parseJsonSafe(response)) as UnidentifiedResponse | null;
      if (!data) {
        throw new Error("Invalid response format from server");
      }
      console.log("[DEBUG] Response data keys:", Object.keys(data));
      console.log("[DEBUG] Session data:", data.session);
      console.log(
        "[DEBUG] Scanned entries count:",
        data.scannedEntries?.length || 0
      );
      console.log(
        "[DEBUG] Missing assets count:",
        data.missingAssets?.length || 0
      );

      // Validate response data structure
      if (!data.session) {
        console.log("[DEBUG] No session data in response");
        throw new Error("Invalid response: missing session data");
      }

      setSession(data.session);
      const initialNotes = data.session.notes ?? "";
      setSessionNotes(initialNotes);
      setNotesDraft(initialNotes);
      setNotesError(null);
      setScannedEntries(data.scannedEntries || []);
      setRemainingAssets(data.missingAssets || []);

      console.log("[DEBUG] State updated successfully");
    } catch (error) {
      console.error("[DEBUG] Failed to load session overview:", error);
      console.error("[DEBUG] Error type:", typeof error);
      console.error(
        "[DEBUG] Error message:",
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error(
        "[DEBUG] Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );

      const message =
        error instanceof Error ? error.message : "Failed to load session data";

      // Handle authentication errors specifically
      if (
        message.toLowerCase().includes("authentication") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("401") ||
        message.toLowerCase().includes("token")
      ) {
        console.log(
          "[DEBUG] Authentication error detected, clearing token and redirecting to login"
        );
        // Clear invalid token
        try {
          const { clearClientAuthToken } = require("@/lib/client-auth");
          clearClientAuthToken();
        } catch (clearError) {
          console.error("[DEBUG] Failed to clear token:", clearError);
        }
        toast.error("Your session has expired. Please log in again.");
        router.push("/login/");
        return;
      }

      // Handle network errors
      if (
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("fetch") ||
        message.toLowerCase().includes("failed to fetch")
      ) {
        console.log("[DEBUG] Network error detected");
        toast.error(
          "Network error. Please check your connection and try again."
        );
        return;
      }

      toast.error(message);
    } finally {
      setLoadingData(false);
    }
  }, [sessionId, router, encodedSessionId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  useEffect(() => {
    if (pendingSessionAction !== "complete") {
      setCompletionNotes("");
      setCompletionNotesError(null);
    }
  }, [pendingSessionAction]);

  const handleFilterChange = (type: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  const resetFiltersAndSort = () => {
    setFilters({
      status: "all",
      category: "all",
      site: "all",
      department: "all",
    });
    setSortOption("name-asc");
  };

  const handleNotesSave = useCallback(async () => {
    if (!sessionId) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      const token = getClientAuthToken();
      if (!token) {
        throw new Error("Your login session expired, please sign in again.");
      }

      const response = await fetch(
        `/api/so-sessions/${encodedSessionId}/notes`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: notesDraft }),
        }
      );

      if (!response.ok) {
        const errorData = (await parseJsonSafe(response)) || {};
        throw new Error(errorData.error || "Failed to save session notes");
      }

      const data = (await parseJsonSafe(response)) || {};
      const latestNotes = data.notes ?? "";
      setSessionNotes(latestNotes);
      setNotesDraft(latestNotes);
      toast.success("Session notes updated");
    } catch (error) {
      console.error("Failed to save session notes:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save session notes";
      setNotesError(message);
      toast.error(message);
    } finally {
      setNotesSaving(false);
    }
  }, [sessionId, notesDraft]);

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
      asset.department?.name,
    ]
      .filter(Boolean)
      .map((field) => String(field).toLowerCase());
    return fields.some((field) => field.includes(normalized));
  };

  const matchesFilters = (asset: Asset) => {
    if (filters.status !== "all" && asset.status !== filters.status)
      return false;
    if (filters.category !== "all" && asset.category?.name !== filters.category)
      return false;
    if (filters.site !== "all" && asset.site?.name !== filters.site)
      return false;
    if (
      filters.department !== "all" &&
      asset.department?.name !== filters.department
    )
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
        case "purchase-newest":
          return (
            new Date(
              b.asset.purchaseDate || b.asset.dateCreated || b.asset.id
            ).getTime() -
            new Date(
              a.asset.purchaseDate || a.asset.dateCreated || a.asset.id
            ).getTime()
          );
        case "purchase-oldest":
          return (
            new Date(
              a.asset.purchaseDate || a.asset.dateCreated || a.asset.id
            ).getTime() -
            new Date(
              b.asset.purchaseDate || b.asset.dateCreated || b.asset.id
            ).getTime()
          );
        case "asset-number-asc":
          return a.asset.noAsset.localeCompare(b.asset.noAsset);
        case "asset-number-desc":
          return b.asset.noAsset.localeCompare(a.asset.noAsset);
        default:
          return 0;
      }
    });
  };
  const normalizedScannedEntries = useMemo(
    () =>
      scannedEntries.map((entry) => ({
        ...entry,
        isCrucial: Boolean(entry.isCrucial),
        crucialNotes: entry.crucialNotes ?? null,
        asset: getEntryDisplayAsset(entry),
      })),
    [scannedEntries]
  );
  const crucialCount = useMemo(
    () => normalizedScannedEntries.filter((entry) => entry.isCrucial).length,
    [normalizedScannedEntries]
  );

  const filteredScannedEntries = useMemo(() => {
    const rows = normalizedScannedEntries.filter(
      (entry) =>
        !entry.isCrucial &&
        entry.asset &&
        matchesFilters(entry.asset) &&
        matchesSearch(entry.asset, searchQuery)
    );
    return sortRows(rows);
  }, [normalizedScannedEntries, filters, searchQuery, sortOption]);

  const filteredCrucialEntries = useMemo(() => {
    const rows = normalizedScannedEntries.filter(
      (entry) =>
        entry.isCrucial &&
        entry.asset &&
        matchesFilters(entry.asset) &&
        matchesSearch(entry.asset, searchQuery)
    );
    return sortRows(rows);
  }, [normalizedScannedEntries, filters, searchQuery, sortOption]);

  const filteredRemainingAssets = useMemo(() => {
    const rows = remainingAssets
      .filter(
        (asset) => matchesFilters(asset) && matchesSearch(asset, searchQuery)
      )
      .map((asset) => ({ asset }));
    return sortRows(rows);
  }, [remainingAssets, filters, searchQuery, sortOption]);

  const handleAssetSelection = useCallback(
    async (
      value: string,
      source: "camera" | "manual"
    ): Promise<{ success: boolean; message?: string }> => {
      const trimmed = value.trim();
      if (!trimmed) {
        return { success: false, message: "Asset number is empty" } as const;
      }

      try {
        const token = getClientAuthToken();

        const response = await fetch(
          `/api/so-sessions/${encodedSessionId}/scan`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ assetNumber: trimmed, source }),
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            return { success: false, message: "Asset not found" } as const;
          }
          const errorData = (await parseJsonSafe(response)) || {};
          return {
            success: false,
            message: errorData.error || "Failed to process scan",
          } as const;
        }

        const data = (await parseJsonSafe(response)) || {};
        if (data.alreadyScanned) {
          toast.info("This asset is already recorded in this session");
        } else {
          toast.success("Asset added to this session");
        }

        if (data.entry) {
          openAssetModal(data.entry.asset ?? null, {
            startEdit: true,
            entry: data.entry,
          });
        } else if (data.asset) {
          openAssetModal(data.asset, { startEdit: true });
        }

        fetchSessionData();

        return { success: true };
      } catch (error) {
        console.error("Scan error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to process scan";
        return { success: false, message };
      }
    },
    [sessionId, fetchSessionData]
  );

  const handleSessionAction = async () => {
    if (!canManageSession) {
      toast.error("Only admins can change the session status.");
      return;
    }
    if (!sessionId || !pendingSessionAction) return;
    const isCompletionAction = pendingSessionAction === "complete";
    const normalizedCompletionNotes = completionNotes.trim();
    if (isCompletionAction && !normalizedCompletionNotes) {
      setCompletionNotesError("Completion notes are required");
      return;
    }
    if (isCompletionAction) {
      setCompletionNotesError(null);
    }
    setSessionActionLoading(true);
    try {
      const token = getClientAuthToken();
      if (!token) {
        throw new Error("Your login session expired, please sign in again.");
      }

      const endpointMap = {
        complete: `/api/so-sessions/${encodedSessionId}/complete`,
        cancel: `/api/so-sessions/${encodedSessionId}/cancel`,
        delete: `/api/so-sessions/${encodedSessionId}/delete`,
      } as const;

      const successMessageMap = {
        complete: "Session completed successfully",
        cancel: "Session cancelled successfully",
        delete: "Session deleted successfully",
      } as const;

      const endpoint = endpointMap[pendingSessionAction];

      const payload =
        isCompletionAction && normalizedCompletionNotes
          ? { completionNotes: normalizedCompletionNotes }
          : null;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const errorData = (await parseJsonSafe(response)) || {};
        throw new Error(errorData.error || "Failed to process session");
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
        error instanceof Error
          ? error.message
          : "Failed to process session action"
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
    <div className="surface-card rounded-2xl border border-dashed border-surface-border/80 py-10 text-center text-sm text-text-muted">
      <AlertCircle className="mx-auto mb-3 h-5 w-5 text-primary" />
      <p>Belum ada aset yang cocok</p>
    </div>
  );
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-surface/40 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-surface-border/70 bg-white/80 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/so-asset")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Badge
                variant={session?.status === "Active" ? "default" : "secondary"}
                className="text-xs"
              >
                {session?.status || "Loading"}
              </Badge>
              {session?.year ? (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-text-muted">
                  {session.year}
                </span>
              ) : null}
            </div>
            {session?.planStart && session?.planEnd ? (
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {formatPlanDate(session.planStart)} -{" "}
                  {formatPlanDate(session.planEnd)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">
                {session?.name || "Stock Opname"}
              </h1>
              <p className="text-sm text-text-muted">
                Panel scan minimalis untuk merekam aset di sesi ini.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Scanned", value: displayScannedCount },
                { label: "Pending", value: crucialCount },
                { label: "Remaining", value: remainingCount },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-surface-border/70 bg-surface px-3 py-2"
                >
                  <p className="text-[0.7rem] text-text-muted">{stat.label}</p>
                  <p className="text-xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="col-span-full">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Progress</span>
                <span className="font-semibold text-foreground">
                  {progressPercent}%{" "}
                  {displayTotalAssets
                    ? `(${displayScannedCount}/${displayTotalAssets})`
                    : ""}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted/50">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <AssetScanPanel
            onDetected={handleAssetSelection}
            title="Scan aset"
            description="Scan barcode atau ketik nomor aset."
            manualPlaceholder="Nomor aset"
            manualHelperText="Tekan X untuk fokus ke input manual."
          />
          <div className="space-y-4">
            <Card className="rounded-3xl border border-surface-border/70 bg-white/80 shadow-sm">
              <CardContent className="space-y-4 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Cari nama / nomor / PIC"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="sneat-input h-12 w-full pl-12 text-sm"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Filter and sort assets"
                        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-background text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                      >
                        <Filter className="h-4 w-4" />
                        <span className="sr-only">Filter & Sort</span>
                        {showActiveFilterDot ? (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                        ) : null}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-80 max-h-[70vh] overflow-y-auto p-0"
                    >
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
                                {status === "all" ? "All statuses" : status}
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
                                    ? "All categories"
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
                                  {site === "all" ? "All locations" : site}
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
                                    handleFilterChange(
                                      "department",
                                      dept || "all"
                                    )
                                  }
                                  className={filterChipClass(
                                    filters.department === (dept || "all")
                                  )}
                                >
                                  {dept === "all" ? "All departments" : dept}
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
                    setActiveList(value as "scanned" | "remaining" | "crucial")
                  }
                >
                  <TabsList className="mb-5 mt-2 flex w-full flex-wrap gap-x-3 gap-y-3 rounded-2xl bg-surface p-2 sm:mb-2 sm:mt-1 sm:grid sm:grid-cols-3 sm:gap-0 sm:p-1">
                    <TabsTrigger
                      value="scanned"
                      className="flex-1 min-w-[calc(50%-0.5rem)] justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm sm:min-w-0 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm sm:font-medium sm:shadow-none"
                    >
                      Scanned ({filteredScannedEntries.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="crucial"
                      className="flex-1 min-w-[calc(50%-0.5rem)] justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm sm:min-w-0 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm sm:font-medium sm:shadow-none"
                    >
                      Pending ({filteredCrucialEntries.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="remaining"
                      className="flex-1 min-w-full justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm sm:min-w-0 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm sm:font-medium sm:shadow-none"
                    >
                      Remaining ({filteredRemainingAssets.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-6 max-h-[70vh] space-y-3 overflow-y-auto pr-1 sm:mt-3">
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
                                Discan {formatDate(entry.scannedAt)}
                              </p>
                              <div className="text-xs text-text-muted">
                                <span className="mr-4">
                                  {entry.asset?.site?.name ||
                                    "Lokasi belum ada"}
                                </span>
                                <span>
                                  {entry.asset?.category?.name ||
                                    "Kategori belum ada"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openAssetModal(entry.asset, {
                                    startEdit: true,
                                    entry,
                                  })
                                }
                                className="justify-center"
                              >
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  ) : activeList === "crucial" ? (
                    filteredCrucialEntries.length === 0 ? (
                      emptyState
                    ) : (
                      filteredCrucialEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-foreground">
                                  {entry.asset?.name}
                                </h3>
                                <Badge className="bg-amber-200 text-amber-900 border border-amber-300 text-[0.65rem]">
                                  Pending
                                </Badge>
                              </div>
                              <p className="font-mono text-xs text-primary">
                                {entry.asset?.noAsset}
                              </p>
                              <p className="text-[0.65rem] uppercase text-text-muted">
                                Ditandai {formatDate(entry.scannedAt)}
                              </p>
                              <div className="text-xs text-text-muted">
                                <span className="mr-4">
                                  {entry.asset?.site?.name ||
                                    "Lokasi belum ada"}
                                </span>
                                <span>
                                  {entry.asset?.category?.name ||
                                    "Kategori belum ada"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openAssetModal(entry.asset, {
                                    startEdit: true,
                                    entry,
                                  })
                                }
                                className="justify-center"
                              >
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                Review
                              </Button>
                            </div>
                          </div>
                          {entry.crucialNotes ? (
                            <p className="mt-2 text-xs text-amber-900/80">
                              Keterangan: {entry.crucialNotes}
                            </p>
                          ) : null}
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
                              {asset.site?.name || "Lokasi belum ada"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openAssetModal(asset, { readOnly: true })
                              }
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Detail
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            {session && (
              <Card className="rounded-2xl border border-surface-border/70 bg-white/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">
                    Catatan sesi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={notesDraft}
                    onChange={(event) => {
                      setNotesDraft(event.target.value);
                      setNotesError(null);
                    }}
                    rows={4}
                    placeholder="Catatan singkat untuk tim."
                    className="min-h-[100px] resize-y border border-surface-border bg-surface"
                  />
                  {notesError ? (
                    <p className="text-sm text-destructive">{notesError}</p>
                  ) : (
                    <p className="text-xs text-text-muted">
                      Terlihat oleh semua anggota sesi.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!hasNotesChanged || notesSaving}
                      onClick={() => {
                        setNotesDraft(sessionNotes);
                        setNotesError(null);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary text-white hover:bg-primary/90"
                      disabled={!hasNotesChanged || notesSaving}
                      onClick={handleNotesSave}
                    >
                      {notesSaving ? "Saving..." : "Simpan"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {session?.status === "Active" && canManageSession && (
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
            <AlertDialogDescription>
              {actionDialogCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingSessionAction === "complete" && (
            <div className="mt-4 space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Notes</p>
              </div>
              <Textarea
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
                placeholder="Write your conclusion here."
                className={cn(
                  "min-h-[120px]",
                  completionNotesError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                )}
                disabled={sessionActionLoading}
              />
              {completionNotesError && (
                <p className="text-sm text-destructive">
                  {completionNotesError}
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sessionActionLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSessionAction}
              disabled={
                sessionActionLoading ||
                (pendingSessionAction === "complete" &&
                  completionNotes.trim() === "")
              }
              className={
                actionDialogCopy.destructive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-primary text-white hover:bg-primary/90"
              }
            >
              {sessionActionLoading
                ? "Processing..."
                : actionDialogCopy.confirm}
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
            ? {
                sessionId: selectedEntry.soSessionId,
                entryId: selectedEntry.id,
                initialIsCrucial: Boolean(selectedEntry.isCrucial),
                initialCrucialNotes: selectedEntry.crucialNotes || "",
              }
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
