"use client";

import { useState, useEffect } from "react";
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
  CheckCheck,
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
  scannedAt: string;
  asset: Asset;
}

interface UnidentifiedAssetsResponse {
  session: {
    id: string;
    name: string;
    year: number;
    status: string;
    totalAssets: number;
    scannedAssets: number;
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

export default function UnidentifiedAssetsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<UnidentifiedAssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (params.id) {
      fetchUnidentifiedAssets();
    }
  }, [params.id]);

  const fetchUnidentifiedAssets = async () => {
    try {
      const response = await fetch(
        `/api/so-sessions/${params.id}/unidentified-assets`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        toast.error("Failed to fetch unidentified assets");
      }
    } catch (error) {
      console.error("Error fetching unidentified assets:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUnidentifiedAssets =
    data?.missingAssets.filter(
      (asset) =>
        asset.noAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.pic?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const getGroupedAssets = () => {
    if (!data) return {};

    switch (activeTab) {
      case "site":
        return data.groupedBy.site;
      case "category":
        return data.groupedBy.category;
      case "department":
        return data.groupedBy.department;
      default:
        return { "All Unidentified Assets": data.missingAssets };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "Broken":
        return "bg-red-100 text-red-800 border-red-200";
      case "Maintenance Process":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Lost/Missing":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Sell":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading unidentified assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load unidentified assets data
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const groupedAssets = getGroupedAssets();

  return (
    <div
      className="container mx-auto py-3 px-1.5 sm:py-6 sm:px-4 max-w-full lg:max-w-7xl w-full overflow-x-hidden"
      style={{ minWidth: "320px", maxWidth: "100vw" }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={`/so-asset/${params.id}/scan`}>
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Back</span>
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">
              Remaining Assets
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {data.session.name} • {data.session.year}
            </p>
          </div>
          <Badge
            variant={data.session.status === "Active" ? "default" : "secondary"}
            className="flex-shrink-0 text-xs"
          >
            {data.session.status}
          </Badge>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="mb-3 sm:mb-6">
        <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-semibold mb-1 text-sm sm:text-base">
                Progress
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {data.statistics.scannedAssets} of {data.statistics.totalAssets}{" "}
                scanned
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-lg sm:text-2xl font-bold">
                {data.statistics.completionPercentage}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Complete
              </div>
            </div>
          </div>
          <Progress
            value={data.statistics.completionPercentage}
            className="mt-2 sm:mt-4"
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:gap-6 lg:grid lg:grid-cols-4">
        {/* Main Content */}
        <div className="w-full lg:col-span-3 space-y-2 sm:space-y-4">
          {/* Search */}
          <div className="flex gap-2 sm:gap-4 items-center">
            <div className="relative flex-1 max-w-full">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Asset List */}
          <Card className="w-full overflow-hidden min-w-0">
            <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-6">
              <div className="flex items-center justify-between min-w-0">
                <CardTitle className="text-sm sm:text-lg truncate">
                  Assets to Scan
                </CardTitle>
                <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {filteredUnidentifiedAssets.length} left
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 overflow-x-hidden">
              {filteredUnidentifiedAssets.length === 0 ? (
                <div className="text-center py-4 sm:py-8 text-muted-foreground">
                  <CheckCheck className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                  <h3 className="text-sm sm:text-lg font-medium mb-1">
                    {searchQuery ? "No assets found" : "All scanned! 🎉"}
                  </h3>
                  <p className="text-xs sm:text-sm">
                    {searchQuery
                      ? "Try adjusting search"
                      : "Great job! All assets scanned."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 sm:space-y-2 max-h-96 sm:max-h-[600px] overflow-y-auto overflow-x-hidden">
                  {filteredUnidentifiedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors min-w-0 w-full"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 mb-1">
                          <span className="font-medium text-xs truncate flex-shrink-0 max-w-[120px]">
                            {asset.noAsset}
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0 leading-none flex-shrink-0"
                            >
                              {asset.status.length > 6
                                ? asset.status.substring(0, 6) + ".."
                                : asset.status}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0 leading-none flex-shrink-0"
                            >
                              M
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1 max-w-[200px] sm:max-w-full">
                          {asset.name.length > 30
                            ? asset.name.substring(0, 30) + "..."
                            : asset.name}
                        </p>
                        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                          <span className="flex-shrink-0">
                            S: {(asset.site?.name || "N/A").substring(0, 6)}
                          </span>
                          <span className="flex-shrink-0">
                            P: {(asset.pic || "N/A").substring(0, 4)}
                          </span>
                          <span className="flex-shrink-0">
                            C: {(asset.category?.name || "N/A").substring(0, 4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-auto space-y-2 sm:space-y-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-lg">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-4 px-3 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Package className="h-3 w-3 sm:h-5 sm:w-5 text-orange-700" />
                </div>
                <div>
                  <div className="text-base sm:text-xl font-bold">
                    {data.statistics.missingAssets}
                  </div>
                  <div className="text-xs text-muted-foreground">Left</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCheck className="h-3 w-3 sm:h-5 sm:w-5 text-green-700" />
                </div>
                <div>
                  <div className="text-base sm:text-xl font-bold">
                    {data.statistics.scannedAssets}
                  </div>
                  <div className="text-xs text-muted-foreground">Scanned</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-3 w-3 sm:h-5 sm:w-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-base sm:text-xl font-bold">
                    {data.statistics.totalAssets}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent className="pt-2 sm:pt-4 px-3 sm:px-6">
              <div className="space-y-1 sm:space-y-2">
                <Link href={`/so-asset/${params.id}/scan`}>
                  <Button
                    variant="outline"
                    className="w-full text-xs sm:text-sm px-2 py-1"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Scan
                  </Button>
                </Link>
                <Link href={`/so-asset/${params.id}/show-results`}>
                  <Button
                    variant="outline"
                    className="w-full text-xs sm:text-sm px-2 py-1"
                  >
                    <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Scanned
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
