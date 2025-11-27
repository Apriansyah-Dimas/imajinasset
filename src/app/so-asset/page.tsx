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
  Activity,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedAccess from "@/components/RoleBasedAccess";
import { useAuth } from "@/contexts/AuthContext";
import { getClientAuthToken } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface SOSession {
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
  const getDefaultDates = () => ({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    description: "",
    ...getDefaultDates(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Active" | "Completed"
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
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      alert("Please provide valid start and end dates.");
      return;
    }
    if (end < start) {
      alert("End date must be after start date.");
      return;
    }
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
          ...getDefaultDates(),
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

  const activeSessions = sessions.filter(
    (session) => session.status === "Active"
  );
  const primaryActiveSession = activeSessions[0];

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value);

  const filterOptions: Array<{ value: typeof statusFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Completed", label: "Completed" },
  ];

  const summaryCards = [
    {
      label: "Active",
      value: formatNumber(statusCounts.active),
      hint: "In progress",
      icon: Activity,
    },
    {
      label: "Completed",
      value: formatNumber(statusCounts.completed),
      hint: "Finished",
      icon: ShieldCheck,
    },
  ];

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? session.status === "Active" || session.status === "Completed"
        : session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const isFiltering = searchQuery.trim().length > 0 || statusFilter !== "all";

  const statusAccent: Record<SOSession["status"], string> = {
    Active: "bg-primary/15 text-primary border border-primary/20",
    Completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    Cancelled: "bg-red-50 text-red-700 border border-red-100",
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const renderSessionCard = (session: SOSession) => {
    const progress = getProgressPercentage(
      session.scannedAssets,
      session.totalAssets
    );
    const hasPlanWindow = session.planStart && session.planEnd;
    const completionNote = (session.completionNotes ?? session.notes ?? "")
      .toString()
      .trim();
    const shouldShowCompletionNote =
      session.status === "Completed" && completionNote.length > 0;

    return (
      <Card
        key={session.id}
        className="rounded-3xl border border-surface-border/70 bg-surface shadow-sm"
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
                  "rounded-full px-3 py-1 text-xs font-medium",
                  statusAccent[session.status]
                )}
              >
                {session.status}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-muted/40 p-0 hover:bg-muted"
                  >
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

          {hasPlanWindow && (
            <p className="flex items-center gap-2 text-xs text-text-muted">
              <Clock className="h-4 w-4 text-primary" />
              Jadwal {formatDate(session.planStart)} -{" "}
              {formatDate(session.planEnd)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-surface-border/70 bg-surface px-4 py-3">
              <p className="text-[0.7rem] text-text-muted">Target</p>
              <p className="text-xl font-semibold text-foreground">
                {formatNumber(session.totalAssets || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-[0.7rem] text-text-muted">Discan</p>
              <p className="text-xl font-semibold text-primary">
                {formatNumber(session.scannedAssets || 0)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-secondary/40">
              <div
                className={cn(
                  "h-2 rounded-full",
                  progress === 100 ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              {formatNumber(session.scannedAssets || 0)} of{" "}
              {formatNumber(session.totalAssets || 0)} assets
            </p>
          </div>

          {shouldShowCompletionNote && (
            <div className="rounded-2xl border border-surface-border/70 bg-surface px-4 py-3">
              <p className="text-[0.65rem] uppercase tracking-wide text-text-muted">
                Completion notes
              </p>
              <p className="mt-1 text-sm text-foreground">
                {completionNote}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {session.status === "Active" && (
              <Button
                asChild
                className="sneat-btn sneat-btn-primary flex-1 justify-center"
              >
                <Link href={`/so-asset/${session.id}/scan`}>
                  <Scan className="mr-2 h-4 w-4" />
                  Start scanning
                </Link>
              </Button>
            )}

            {session.status === "Cancelled" && (
              <Button
                variant="outline"
                className="w-full cursor-not-allowed bg-muted/40 text-text-muted"
                disabled
              >
                Cancelled
              </Button>
            )}

            {session.status === "Completed" && (
              <Button
                asChild
                variant="outline"
                className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Link href={`/so-asset/${session.id}/show-results`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View results
                </Link>
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="surface-card animate-pulse rounded-[32px] border border-surface-border/60 px-6 py-10">
            <div className="h-4 w-28 rounded-full bg-surface-border/70" />
            <div className="mt-3 h-10 w-64 rounded-xl bg-surface-border/60" />
            <div className="mt-4 h-4 w-3/4 rounded-full bg-surface-border/60" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="surface-card animate-pulse rounded-2xl p-5">
                <div className="h-9 w-9 rounded-2xl bg-surface-border/60" />
                <div className="mt-4 h-4 w-2/3 rounded-full bg-surface-border/70" />
                <div className="mt-2 h-6 w-1/3 rounded-full bg-surface-border/60" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="surface-card animate-pulse rounded-3xl p-6">
                <div className="h-4 w-1/2 rounded-full bg-surface-border/70" />
                <div className="mt-4 h-12 rounded-2xl bg-surface-border/60" />
                <div className="mt-3 h-2 rounded-full bg-surface-border/50" />
                <div className="mt-2 h-2 rounded-full bg-surface-border/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="rounded-3xl border border-surface-border/70 bg-surface px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Stock Opname</h1>
              <p className="text-sm text-text-muted">Manage asset verification sessions with ease.</p>
            </div>
            <RoleBasedAccess allowedRoles={["ADMIN"]}>
              <Button
                className="sneat-btn sneat-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </RoleBasedAccess>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex items-center justify-between rounded-2xl border border-surface-border/70 bg-surface px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm text-text-muted">{card.label}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-text-muted/80">{card.hint}</p>
                </div>
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-surface-border/70 bg-surface px-5 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search sessions"
                className="sneat-input h-11 w-full rounded-full pl-11"
              />
            </div>
            <div className="flex flex-wrap gap-1 rounded-full border border-surface-border/60 bg-muted/30 p-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                    statusFilter === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
              {isFiltering && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="rounded-full px-3 py-1.5 text-xs text-text-muted hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {filteredSessions.length === 0 ? (
          <div className="surface-card rounded-[28px] border border-dashed border-surface-border/70 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <List className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              {sessions.length === 0 ? "No sessions yet" : "No results found"}
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              {sessions.length === 0
                ? "Add a new session to start scanning assets."
                : "Try a different keyword or status filter."}
            </p>
            {sessions.length === 0 && (
              <RoleBasedAccess allowedRoles={["ADMIN"]}>
                <Button
                  className="sneat-btn sneat-btn-primary mt-5 inline-flex items-center gap-2 px-6"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create session
                </Button>
              </RoleBasedAccess>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
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
                <Button
                  type="submit"
                  disabled={
                    !formData.name.trim() ||
                    new Date(formData.endDate) < new Date(formData.startDate)
                  }
                >
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
              You can view Stock Opname progress but cannot make changes.
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
