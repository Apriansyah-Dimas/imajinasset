"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  Search,
  ArrowLeft,
  Filter,
  Building,
  Tag,
  Users,
  XCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedAccess from "@/components/RoleBasedAccess";
import { useAuth } from "@/contexts/AuthContext";
import { getClientAuthToken } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  noAsset: string;
  name: string;
  status: string;
  serialNo?: string;
  pic?: string | null;
  imageUrl?: string | null;
  brand?: string;
  model?: string;
  cost?: number;
  site?: { name: string };
  category?: { name: string };
  department?: { name: string };
}

interface ScannedEntry {
  id: string;
  assetId: string;
  isIdentified: boolean;
  isCrucial?: boolean;
  crucialNotes?: string | null;
  scannedAt: string;
  asset: Asset;
}

interface UnidentifiedAssetsResponse {
  session: {
    id: string;
    name: string;
    year: number;
    description?: string;
    planStart?: string | null;
    planEnd?: string | null;
    notes?: string | null;
    status: "Active" | "Completed" | "Cancelled";
    totalAssets: number;
    scannedAssets: number;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    completionNotes?: string | null;
  };
  statistics: {
    totalAssets: number;
    scannedAssets: number;
    missingAssets: number;
    identifiedAssets: number;
    completionPercentage: number;
    identificationPercentage: number;
  };
  missingAssets: Asset[];
  groupedBy: {
    site: Record<string, Asset[]>;
    category: Record<string, Asset[]>;
    department: Record<string, Asset[]>;
  };
  scannedEntries: ScannedEntry[];
}

// Constants untuk pagination dan filtering
const ITEMS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_DELAY = 300;

export default function UnidentifiedAssetsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<UnidentifiedAssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State untuk pagination dan virtual scroll
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(ITEMS_PER_PAGE);

  // Debounced search untuk performa lebih baik
  const debouncedSearchQuery = useMemo(() => {
    const trimmedQuery = searchQuery ? searchQuery.trim() : '';
    return trimmedQuery ? `${trimmedQuery} - ${Date.now()}` : ''
  }, [searchQuery]);

  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (params.id) {
      fetchUnidentifiedAssets();
    }
  }, [params.id]);

  // Enhanced filtered assets dengan useMemo untuk performa lebih baik
  const filteredUnidentifiedAssets = useMemo(() => {
    if (!data?.missingAssets) return [];

    const query = debouncedSearchQuery.toLowerCase().trim();
    const statusFilter = activeTab;

    return data?.missingAssets.filter((asset) => {
      const matchesSearch =
        !query ||
        asset.noAsset.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        (asset.description || "").toLowerCase().includes(query) ||
        asset.serialNo?.toLowerCase().includes(query) ||
        asset.pic?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        asset.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesCategory =
        statusFilter === "all" ||
        asset.category?.name.toLowerCase().includes(query);

      const matchesDepartment =
        statusFilter === "all" ||
        asset.department?.name.toLowerCase().includes(query);

      return matchesSearch && matchesStatus && matchesCategory && matchesDepartment;
    });
  }, [data?.missingAssets, debouncedSearchQuery, statusFilter]);

  // Pagination logic
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUnidentifiedAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUnidentifiedAssets, currentPage]);

  const totalPages = Math.ceil((filteredUnidentifiedAssets?.length || 0) / itemsPerPage);

  const getGroupedAssets = () => {
    if (!data) return { site: {}, category: {}, department: {} };

    return {
      site: data.missingAssets.reduce((acc, asset) => {
        if (!asset.site) return acc;
        const siteName = asset.site?.name || "N/A";
        return {
          ...acc,
          [siteName]: [...(acc[siteName] || []), asset]
        };
      }, {}),
      category: data.missingAssets.reduce((acc, asset) => {
        if (!asset.category) return acc;
        const categoryName = asset.category?.name || "N/A";
        return {
          ...acc,
          [categoryName]: [...(acc[categoryName] || []), asset]
        };
      }, {}),
      department: data.missingAssets.reduce((acc, asset) => {
        if (!asset.department) return acc;
        const departmentName = asset.department?.name || "N/A";
        return {
          ...acc,
          [departmentName]: [...(acc[departmentName] || []), asset]
        };
      }, {})
    };
  };

  const statusAccent: Record<string, string> = {
    Active: "bg-green-100 text-green-800 border-green-200",
    Broken: "bg-red-100 text-red-800 border-red-200",
    "Maintenance Process": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Lost/Missing": "bg-orange-100 text-orange-800 border-orange-200",
    Completed: "bg-emerald-100 text-emerald-700 border-emerald-100",
    Cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    Sell: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const filterOptions: Array<{ value: typeof statusFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Completed", label: "Completed" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderSessionCard = (session: UnidentifiedAssetsResponse["session"]) => {
    const progress = session.statistics.completionPercentage;

    // Format progress dengan desimal agar lebih baik
    const progressPercentage = Math.round(progress);

    return (
      <Card
        key={session.id}
        className="rounded-3xl border border-surface-border/70 bg-surface shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-text-muted">Year {session.year}</p>
              <h3 className="text-xl font-semibold text-foreground">
                {session.name}
              </h3>
              {session.description && (
                <p className="text-sm text-text-muted line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all duration-300",
                  statusAccent[session.status]
                )}
              >
                {session.status}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-muted/40 p-0 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {session.status === "Active" && (
                    <>
                      <RoleBasedAccess allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
                        <DropdownMenuItem
                          onClick={() => openCancelDialog(session)}
                          className="text-destructive focus:text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      </RoleBasedAccess>
                    </>
                  )}
                  {session.status === "Cancelled" && (
                    <>
                      <RoleBasedAccess allowedRoles={["ADMIN"]}>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(session)}
                          className="text-destructive focus:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </RoleBasedAccess>
                    </>
                  )}
                  {session.status === "Completed" && (
                    <>
                      <RoleBasedAccess allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(session)}
                          className="text-destructive focus:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </RoleBasedAccess>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress Section with Enhanced Styling */}
          <div className="mt-2 h-2 rounded-full bg-secondary/40">
            <div className="flex items-center justify-between p-3">
              <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-xs text-muted">{progressPercentage}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-2 rounded-full bg-primary transition-all duration-300 ease-in-out",
                        progress === 100 ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAssetCard = (asset: Asset, index: number) => {
    return (
      <Card
        key={asset.id}
        className="rounded-3xl border border-surface-border/70 bg-surface shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-text-muted">{formatNumber(index + 1)}</p>
              <h3 className="text-xl font-semibold text-foreground truncate max-w-[200px]">
                {asset.name}
              </h3>
            </div>
            <div className="text-right">
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs"
              >
                {asset.status || "Unidentified"}
              </Badge>
            </div>
          </div>
          {(asset.serialNo || asset.pic || asset.imageUrl || asset.brand || asset.model) && (
            <div className="mt-2 space-y-1 text-xs text-text-muted">
              {asset.serialNo && (
                <p>
                  <span className="font-medium">Serial No:</span> {asset.serialNo}
                </p>
              )}
              {asset.pic && (
                <p>
                  <span className="font-medium">PIC:</span> {asset.pic}
                </p>
              )}
              {asset.brand && (
                <p>
                  <span className="font-medium">Brand:</span> {asset.brand}
                </p>
              )}
              {asset.model && (
                <p>
                  <span className="font-medium">Model:</span> {asset.model}
                </p>
              )}
              {asset.cost && (
                <p>
                  <span className="font-medium">Cost:</span> Rp {asset.cost?.toLocaleString()}
                </p>
              )}
              {asset.site && (
                <p>
                  <span className="font-medium">Site:</span> {asset.site?.name}
                </p>
              )}
              {asset.category && (
                <p>
                  <span className="font-medium">Category:</span> {asset.category?.name}
                </p>
              )}
              {asset.department && (
                <p>
                  <span className="font-medium">Department:</span> {asset.department?.name}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="surface-card animate-pulse rounded-[32px] border border-surface-border/70 bg-surface px-6 py-12 text-center">
            <List className="h-6 w-6" />
            <h3 className="text-xl font-semibold text-foreground">Loading unidentified assets...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto flex w-full max-w-6xl space-y-8">
          <section className="rounded-3xl border border-surface-border/70 bg-surface px-6 py-6 shadow-sm">
            <div className="flex flex-col sm:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Unidentified Assets</h1>
                <p className="text-sm text-text-muted">Manage asset verification sessions with ease.</p>
              </div>
              <RoleBasedAccess allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
                <Button
                  className="sneat-btn sneat-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Session
                </Button>
              </RoleBasedAccess>
            </div>
          </div>
        </section>

        {/* Search and Filter Section */}
        <section className="rounded-3xl border border-surface-border/70 bg-surface px-5 py-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-0">
              <Search
                value={debouncedSearchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="pl-8 sm:pl-10 text-xs sm:text-sm"
              />
            </div>

            {/* Filter Options */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveTab(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    activeTab === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Clear Filter Button */}
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setSearchQuery("");
                }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors text-text-muted hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Results with Pagination */}
        <section className="rounded-3xl border border-surface-border/70 bg-surface px-6 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">
                Unidentified Assets ({paginatedAssets.length} total)
              </h3>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            )}
          </div>

          {/* Virtual Scrolling Container */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedAssets.map((asset, index) => renderAssetCard(asset, index + 1))}
          </div>
        </section>
      </div>
    );
  }

  const isFiltering = searchQuery.trim().length > 0 || activeTab !== "all";

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
      <SOAssetPageContent />
    </ProtectedRoute>
  );
}