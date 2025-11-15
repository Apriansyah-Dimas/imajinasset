"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Clock,
  XCircle,
  List,
  Search,
  Trash2,
  Eye,
  Scan,
  MoreHorizontal,
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedAccess from "@/components/RoleBasedAccess";
import { useAuth } from "@/contexts/AuthContext";
import { getClientAuthToken } from "@/lib/client-auth";

interface SOSession {
  id: string;
  name: string;
  year: number;
  description?: string;
  status: "Active" | "Completed" | "Cancelled";
  totalAssets: number;
  scannedAssets: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

function SOAssetPageContent() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SOSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SOSession | null>(
    null
  );
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    description: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Active" | "Completed" | "Cancelled"
  >("all");

  const parseErrorResponse = async (response: Response) => {
    try {
      return await response.json();
    } catch {
      const text = await response.text();
      return text ? { error: text } : {};
    }
  };

  const isViewer = user?.role === "VIEWER";
  const canCreate = user?.role === "ADMIN";
  const canScan = user?.role === "ADMIN" || user?.role === "SO_ASSET_USER";

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    console.log("Fetching SO sessions...");
    try {
      // Get token from client storage
      const token = getClientAuthToken();
      if (!token) {
        console.error("No auth token found");
        setSessions([]);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/so-sessions", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("Sessions data:", data);
        setSessions(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch sessions:", errorData);
        setSessions([]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get token from client storage
      const token = getClientAuthToken();
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const response = await fetch("/api/so-sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setFormData({
          name: "",
          year: new Date().getFullYear(),
          description: "",
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        console.error("Failed to create session:", errorData);
      }
    } catch (error) {
      console.error("Error creating SO session:", error);
    }
  };

  const handleCancelSession = async () => {
    if (!selectedSession) return;

    setCancelling(true);
    try {
      // Get token from client storage
      const token = getClientAuthToken();
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const response = await fetch(
        `/api/so-sessions/${selectedSession.id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setShowCancelDialog(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        const errorData = await response.json();
        console.error("Failed to cancel session:", errorData);
      }
    } catch (error) {
      console.error("Error cancelling SO session:", error);
    } finally {
      setCancelling(false);
    }
  };

  const openCancelDialog = (session: SOSession) => {
    setSelectedSession(session);
    setShowCancelDialog(true);
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    setDeleting(true);
    try {
      // Get token from client storage
      const token = getClientAuthToken();
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const response = await fetch(
        `/api/so-sessions/${selectedSession.id}/delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setShowDeleteDialog(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        const errorData = await parseErrorResponse(response);
        console.error("Failed to delete session:", errorData);
      }
    } catch (error) {
      console.error("Error deleting SO session:", error);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (session: SOSession) => {
    setSelectedSession(session);
    setShowDeleteDialog(true);
  };

  const getProgressPercentage = (scanned: number, total: number) => {
    if (!scanned || !total || total === 0) return 0;
    return Math.round((scanned / total) * 100);
  };

  const statusCounts = {
    total: sessions.length,
    active: sessions.filter((session) => session.status === "Active").length,
    completed: sessions.filter((session) => session.status === "Completed")
      .length,
    cancelled: sessions.filter((session) => session.status === "Cancelled")
      .length,
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true : session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const isFiltering = searchQuery.trim().length > 0 || statusFilter !== "all";

  const statusStyles: Record<SOSession["status"], string> = {
    Active: "bg-primary/15 text-primary border border-primary/20",
    Completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    Cancelled: "bg-red-50 text-red-700 border border-red-100",
  };

  const checkFlowNav = [
    {
      id: "check-in",
      title: "Check In",
      subtitle: "Peminjaman Aset",
      accent: "bg-blue-100 text-blue-700",
    },
    {
      id: "check-out",
      title: "Check Out",
      subtitle: "Pengembalian Aset",
      accent: "bg-emerald-100 text-emerald-700",
    },
  ];

  const checkFlows = [
    {
      id: "check-in",
      title: "Check In (Peminjaman Aset)",
      definition:
        "Proses pencatatan saat aset keluar dari storage dan dipinjamkan kepada individu atau departemen tertentu.",
      purpose:
        "Memberikan visibilitas penuh mengenai siapa yang bertanggung jawab atas aset dan untuk tujuan apa aset digunakan.",
      icon: ArrowUpCircle,
      accent: "text-blue-600 bg-blue-100",
      infoLabel: "Catatan yang wajib diisi",
      info: [
        "Tanggal & waktu peminjaman",
        "Identitas peminjam (nama, departemen, ID karyawan)",
        "Kondisi aset saat dipinjam",
        "Tujuan penggunaan aset",
        "Estimasi tanggal pengembalian",
      ],
      reminder:
        "Pastikan peminjam menandatangani form digital/berita acara sebagai bukti serah terima.",
    },
    {
      id: "check-out",
      title: "Check Out (Pengembalian Aset)",
      definition:
        "Pencatatan saat aset kembali ke storage setelah digunakan, lengkap dengan kondisi mutakhirnya.",
      purpose:
        "Menjamin aset tersedia kembali dan mendeteksi kerusakan atau komponen yang hilang setelah pemakaian.",
      icon: ArrowDownCircle,
      accent: "text-emerald-600 bg-emerald-100",
      infoLabel: "Validasi saat pengembalian",
      info: [
        "Tanggal & waktu pengembalian",
        "Kondisi aset setelah dipakai",
        "Catatan kerusakan / kebutuhan perbaikan",
        "Verifikasi kelengkapan komponen",
      ],
      reminder:
        "Dokumentasikan foto kondisi aset bila ditemukan kerusakan untuk mempercepat klaim biaya atau maintenance.",
    },
  ];

  const checkFlowBenefits = [
    "Akuntabilitas: setiap aset selalu memiliki penanggung jawab yang jelas.",
    "Audit Trail: histori lengkap memudahkan investigasi dan compliance.",
    "Preventive Maintenance: jadwalkan servis berdasarkan frekuensi pemakaian.",
    "Optimisasi utilisasi: identifikasi aset yang paling sering atau jarang dipakai.",
    "Pencegahan kehilangan: pengembalian terlambat langsung terdeteksi.",
  ];

  const renderSessionCard = (session: SOSession) => {
    const progress = getProgressPercentage(
      session.scannedAssets,
      session.totalAssets
    );
    return (
      <Card
        key={session.id}
        className="shadow-sm border border-surface-border/60"
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground truncate">
                {session.name}
              </p>
              <p className="text-sm text-text-muted mt-1">
                Tahun {session.year}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusStyles[session.status]
                }`}
              >
                {session.status}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {session.status === "Active" && (
                    <>
                      <RoleBasedAccess allowedRoles={["ADMIN"]}>
                        <DropdownMenuItem
                          onClick={() => openCancelDialog(session)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      </RoleBasedAccess>
                      <RoleBasedAccess allowedRoles={["ADMIN"]}>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(session)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </RoleBasedAccess>
                    </>
                  )}

                  {session.status === "Cancelled" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/so-asset/${session.id}/show-results`}
                          className="flex items-center"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Show Results
                        </Link>
                      </DropdownMenuItem>
                      <RoleBasedAccess allowedRoles={["ADMIN"]}>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(session)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </RoleBasedAccess>
                    </>
                  )}

                  {session.status === "Completed" && (
                    <RoleBasedAccess allowedRoles={["ADMIN"]}>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(session)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </RoleBasedAccess>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {session.description && (
            <p className="text-sm text-text-muted line-clamp-2">
              {session.description}
            </p>
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-secondary/30">
              <div
                className={`h-2.5 rounded-full ${
                  progress === 100 ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {session.scannedAssets} dari {session.totalAssets || 0} asset
              sudah discan
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.status === "Active" && (
              <Link href={`/so-asset/${session.id}/scan`} className="flex-1">
                <Button className="w-full">
                  <Scan className="mr-2 h-4 w-4" />
                  Start Scan
                </Button>
              </Link>
            )}

            {session.status === "Cancelled" && (
              <Button variant="outline" className="w-full" disabled>
                Cancelled
              </Button>
            )}

            {session.status === "Completed" && (
              <Link
                href={`/so-asset/${session.id}/show-results`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Show Results
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-surface-border/70" />
            <div className="h-8 w-64 rounded-xl bg-surface-border/60" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface-card animate-pulse space-y-4">
                <div className="h-3 w-20 rounded-full bg-surface-border/70" />
                <div className="h-6 w-28 rounded-full bg-surface-border/60" />
                <div className="h-2 w-full rounded-full bg-surface-border/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-text-muted">Stock Opname</p>
            <h1 className="text-3xl font-semibold text-foreground">
              SO Asset Sessions
            </h1>
            <p className="text-sm text-text-muted">
              Pantau progres dan kelola sesi pemeriksaan aset dengan cepat.
            </p>
          </div>
          <RoleBasedAccess allowedRoles={["ADMIN"]}>
            <Button
              className="self-start"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Sesi baru
            </Button>
          </RoleBasedAccess>
        </div>

        <nav className="rounded-2xl border border-surface-border/80 bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-stretch divide-y divide-surface-border/60 sm:divide-y-0 sm:divide-x">
            {checkFlowNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex-1 min-w-[200px] px-5 py-4 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {item.title}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${item.accent}`}
                  >
                    {item.subtitle}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Klik untuk detail & SOP
                  </span>
                </div>
              </a>
            ))}
          </div>
        </nav>

        <div className="grid gap-4 lg:grid-cols-2" id="check-in-and-out">
          {checkFlows.map((flow) => {
            const Icon = flow.icon;
            return (
              <Card
                key={flow.id}
                id={flow.id}
                className="border border-surface-border/80 shadow-sm"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${flow.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-base">
                        {flow.title}
                      </CardTitle>
                      <CardDescription>{flow.definition}</CardDescription>
                    </div>
                  </div>
                  <Alert className="border-none bg-primary/5 text-sm text-foreground">
                    <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                    <AlertDescription>{flow.purpose}</AlertDescription>
                  </Alert>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {flow.infoLabel}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-text-muted">
                      {flow.info.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 rounded-lg border border-surface-border/60 bg-surface/80 px-3 py-2"
                        >
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary">
                    {flow.reminder}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border border-surface-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Manfaat Check In / Check Out
              </CardTitle>
              <CardDescription>
                Penerapan SOP ini menjaga sinkronisasi data aset dan mendukung
                proses audit maupun maintenance.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {checkFlowBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-xl border border-surface-border/60 bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Session</CardDescription>
              <CardTitle className="text-3xl">{statusCounts.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl text-primary">
                {statusCounts.active}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl text-emerald-600">
                {statusCounts.completed}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cancelled</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {statusCounts.cancelled}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="shadow-sm border border-surface-border/60">
          <CardContent className="space-y-1.5 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4 py-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama atau deskripsi sesi"
                className="pl-9"
              />
            </div>
            <div className="flex w-full flex-col gap-1.5 md:w-auto md:flex-row md:items-center">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
                className="h-8 rounded-md border border-surface-border/70 bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Semua status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              {isFiltering && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-text-muted"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Reset filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredSessions.length === 0 ? (
          <div className="surface-card text-center py-12">
            <List className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {sessions.length === 0
                ? "Belum ada sesi stock opname"
                : "Tidak ada sesi yang cocok"}
            </h3>
            <p className="text-sm text-text-muted">
              {sessions.length === 0
                ? "Buat sesi pertama untuk mulai memindai aset."
                : "Coba ubah kata kunci atau filter status."}
            </p>
            {sessions.length === 0 && (
              <RoleBasedAccess allowedRoles={["ADMIN"]}>
                <Button
                  className="mt-6"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mulai sesi sekarang
                </Button>
              </RoleBasedAccess>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map(renderSessionCard)}
          </div>
        )}
        {/* Cancel Session Dialog */}
        {/* Cancel Session Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Stock Opname Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this stock opname session? This
                will delete all scanned assets and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Session Summary:</h4>
                  <div className="text-sm space-y-1">
                    <div>Session: {selectedSession.name}</div>
                    <div>Assets Scanned: {selectedSession.scannedAssets}</div>
                    <div>Total Assets: {selectedSession.totalAssets}</div>
                    <div>
                      Progress:{" "}
                      {getProgressPercentage(
                        selectedSession.scannedAssets,
                        selectedSession.totalAssets
                      )}
                      %
                    </div>
                  </div>
                </div>
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This action cannot be undone. All
                    scanned assets will be deleted and the session will be
                    cancelled.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(false)}
                  >
                    No, Keep Session
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelSession}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Yes, Cancel Session
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Create Session Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stock Opname Session</DialogTitle>
              <DialogDescription>
                Create a new session to track and manage asset inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Annual Stock Opname 2025"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="2020"
                  max="2030"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose and scope of this stock opname session..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.name.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Session
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {/* Delete Session Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Stock Opname Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this cancelled stock
                opname session? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Session to Delete:</h4>
                  <div className="text-sm space-y-1">
                    <div>Session: {selectedSession.name}</div>
                    <div>Year: {selectedSession.year}</div>
                    <div>Status: {selectedSession.status}</div>
                    <div>
                      Created:{" "}
                      {new Date(selectedSession.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Alert variant="destructive">
                  <Trash2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will permanently delete the
                    session and all its data. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteSession}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Permanently
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Read-only message for Viewer users */}
        {isViewer && (
          <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg max-w-xs z-50">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Read-only Mode</span>
            </div>
            <p className="text-xs mt-1">
              You can view SO Asset progress but cannot make changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SOAssetPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
      <SOAssetPageContent />
    </ProtectedRoute>
  );
}
