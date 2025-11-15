"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, Eye, Search } from "lucide-react";
import { toast } from "sonner";

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
}

interface ScannedEntry {
  id: string;
  assetId: string;
  soSessionId: string;
  scannedAt: string;
  status: string;
  isIdentified: boolean;
  asset: Asset;
}

interface SessionOverview {
  id: string;
  name: string;
  year: number;
  description?: string;
  status: string;
  totalAssets: number;
  scannedAssets: number;
}

interface UnidentifiedResponse {
  session: SessionOverview;
  missingAssets: Asset[];
  scannedEntries: ScannedEntry[];
}

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

function ShowResultsPageContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionOverview | null>(null);
  const [scannedEntries, setScannedEntries] = useState<ScannedEntry[]>([]);
  const [remainingAssets, setRemainingAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"scanned" | "remaining">("scanned");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      setLoading(true);
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
        console.error("Failed to load show results page:", error);
        toast.error("Gagal memuat hasil sesi");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId]);

  const filteredScannedEntries = useMemo(() => {
    if (!searchQuery.trim()) return scannedEntries;
    const q = searchQuery.toLowerCase();
    return scannedEntries.filter((entry) => {
      const asset = entry.asset;
      return [
        asset.name,
        asset.noAsset,
        asset.status,
        asset.serialNo,
        asset.site?.name,
        asset.category?.name,
        asset.department?.name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [scannedEntries, searchQuery]);

  const filteredRemainingAssets = useMemo(() => {
    if (!searchQuery.trim()) return remainingAssets;
    const q = searchQuery.toLowerCase();
    return remainingAssets.filter((asset) =>
      [
        asset.name,
        asset.noAsset,
        asset.status,
        asset.serialNo,
        asset.site?.name,
        asset.category?.name,
        asset.department?.name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [remainingAssets, searchQuery]);

  const totalAssets = scannedEntries.length + remainingAssets.length;
  const scannedCount = scannedEntries.length;
  const remainingCount = remainingAssets.length;
  const progress =
    remainingCount === 0
      ? scannedCount > 0
        ? 100
        : 0
      : Math.min(100, Math.round((scannedCount / remainingCount) * 100));

  const emptyState = (
    <div className="surface-card border border-dashed border-surface-border/80 py-10 text-center text-sm text-text-muted">
      <AlertCircle className="mx-auto mb-3 h-5 w-5 text-primary" />
      <p>Tidak ada aset yang sesuai dengan pencarian</p>
    </div>
  );

  const openAssetModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
  };

  const closeAssetModal = (open: boolean) => {
    setShowAssetModal(open);
    if (!open) {
      setSelectedAsset(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/so-asset")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          <Badge
            variant={session?.status === "Active" ? "default" : "secondary"}
            className="text-xs"
          >
            {session?.status || "Loading"}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {session?.name || "Memuat sesi..."}
            </h1>
            {session?.year ? (
              <span className="text-sm text-text-muted">Tahun {session.year}</span>
            ) : null}
          </div>
          {session?.description ? (
            <p className="text-sm text-text-muted">{session.description}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-text-muted">Total Assets</CardTitle>
              <CardContent className="px-0 pb-0">
                <p className="text-2xl font-semibold text-foreground">{totalAssets}</p>
              </CardContent>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-text-muted">Scanned</CardTitle>
              <CardContent className="px-0 pb-0">
                <p className="text-2xl font-semibold text-primary">{scannedCount}</p>
              </CardContent>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-text-muted">Remaining</CardTitle>
              <CardContent className="px-0 pb-0">
                <p className="text-2xl font-semibold text-amber-600">{remainingCount}</p>
              </CardContent>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-text-muted">Progress</CardTitle>
              <CardContent className="px-0 pb-0">
                <p className="text-2xl font-semibold text-foreground">{progress}%</p>
              </CardContent>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari nama, nomor aset, atau lokasi"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "scanned" | "remaining")}>
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-surface">
                <TabsTrigger value="scanned" className="rounded-xl">
                  Scanned ({filteredScannedEntries.length})
                </TabsTrigger>
                <TabsTrigger value="remaining" className="rounded-xl">
                  Remaining ({filteredRemainingAssets.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-surface-border/40 animate-pulse" />
                  ))}
                </div>
              ) : activeTab === "scanned" ? (
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
                              {entry.asset.name}
                            </h3>
                            <Badge className={`text-[0.65rem] ${getStatusColor(entry.asset.status)}`}>
                              {entry.asset.status}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs text-primary">{entry.asset.noAsset}</p>
                          <p className="text-[0.65rem] text-text-muted">
                            Discan pada {formatDate(entry.scannedAt)}
                          </p>
                          <div className="text-xs text-text-muted">
                            <span className="mr-4">
                              {entry.asset.site?.name || "Lokasi tidak ada"}
                            </span>
                            <span>{entry.asset.category?.name || "Kategori tidak ada"}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssetModal(entry.asset)}
                            className="justify-center"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Detail asset
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : filteredRemainingAssets.length === 0 ? (
                emptyState
              ) : (
                filteredRemainingAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-2xl border border-dashed border-surface-border bg-surface/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{asset.name}</h3>
                        <p className="font-mono text-xs text-primary">{asset.noAsset}</p>
                        <p className="text-[0.65rem] text-text-muted">
                          {asset.site?.name || "Lokasi belum diatur"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAssetModal(asset)}>
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
      </div>

      <AssetDetailModal
        asset={selectedAsset}
        open={showAssetModal}
        onOpenChange={closeAssetModal}
        onUpdate={() => undefined}
        forceReadOnly
      />
    </div>
  );
}

export default function ShowResultsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
      <ShowResultsPageContent />
    </ProtectedRoute>
  );
}
