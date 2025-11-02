"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedAccess from "@/components/RoleBasedAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Flag,
  FileText,
  Download,
  Eye,
  Settings,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Session {
  id: string;
  name: string;
  year: number;
  description?: string;
  status: "Active" | "Completed" | "Cancelled";
  totalAssets: number;
  scannedAssets: number;
  verifiedAssets: number;
  completionRate: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function SessionManagementPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"complete" | "cancel" | null>(
    null
  );

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    year: new Date().getFullYear().toString(),
    description: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    year: "",
    description: "",
  });

  useEffect(() => {
    fetchSessions();
  }, [currentPage, searchQuery, statusFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/sessions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setActionLoading("create");
    try {
      const response = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setCreateForm({
          name: "",
          year: new Date().getFullYear().toString(),
          description: "",
        });
        fetchSessions();
        toast.success("Session created successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create session");
      }
    } catch (error) {
      toast.error("Failed to create session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSession = async () => {
    if (!selectedSession) return;

    setActionLoading("edit");
    try {
      const response = await fetch(
        `/api/admin/sessions/${selectedSession.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            data: editForm,
          }),
        }
      );

      if (response.ok) {
        setShowEditDialog(false);
        fetchSessions();
        toast.success("Session updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update session");
      }
    } catch (error) {
      toast.error("Failed to update session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSessionAction = async () => {
    if (!selectedSession || !actionType) return;

    setActionLoading(actionType);
    try {
      const response = await fetch(
        `/api/admin/sessions/${selectedSession.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionType,
          }),
        }
      );

      if (response.ok) {
        setShowActionDialog(false);
        fetchSessions();
        toast.success(`Session ${actionType}d successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${actionType} session`);
      }
    } catch (error) {
      toast.error(`Failed to ${actionType} session`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    setActionLoading("delete");
    try {
      const response = await fetch(
        `/api/admin/sessions/${selectedSession.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setShowDeleteDialog(false);
        fetchSessions();
        toast.success("Session deleted successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete session");
      }
    } catch (error) {
      toast.error("Failed to delete session");
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (session: Session) => {
    setSelectedSession(session);
    setEditForm({
      name: session.name,
      year: session.year.toString(),
      description: session.description || "",
    });
    setShowEditDialog(true);
  };

  const openActionDialog = (session: Session, type: "complete" | "cancel") => {
    setSelectedSession(session);
    setActionType(type);
    setShowActionDialog(true);
  };

  const openDeleteDialog = (session: Session) => {
    setSelectedSession(session);
    setShowDeleteDialog(true);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      Active: "bg-green-100 text-green-800",
      Completed: "bg-blue-100 text-blue-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || colors.Active;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <Play className="h-3 w-3" />;
      case "Completed":
        return <CheckCircle className="h-3 w-3" />;
      case "Cancelled":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const exportSessions = async () => {
    try {
      const response = await fetch("/api/admin/sessions/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sessions-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Sessions exported successfully!");
    } catch (error) {
      toast.error("Failed to export sessions");
    }
  };

  return (
    <ProtectedRoute>
      <RoleBasedAccess allowedRoles={["ADMIN"]}>
        <div className="p-3 sm:p-4 bg-gray-50 min-h-screen w-full overflow-x-hidden">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    ← Back
                  </Button>
                </Link>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                    SESSION MANAGEMENT
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Manage SO sessions and track progress
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportSessions}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("");
                    setCurrentPage(1);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading...
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Calendar className="h-12 w-12 mb-4 opacity-50" />
                  <p>No sessions found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Session
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Session
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assets
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {session.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {session.year} •{" "}
                                {session.description || "No description"}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <Badge
                              className={getStatusBadgeColor(session.status)}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(session.status)}
                                {session.status}
                              </span>
                            </Badge>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="w-full max-w-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">
                                  {session.completionRate}%
                                </span>
                                <span className="text-xs text-gray-500">
                                  {session.verifiedAssets}/
                                  {session.scannedAssets} verified
                                </span>
                              </div>
                              <Progress
                                value={session.completionRate}
                                className="h-2"
                              />
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3" />
                              {session.scannedAssets}/{session.totalAssets}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex justify-end gap-1">
                              <Link
                                href={`/so-asset/${session.id}/scan`}
                                target="_blank"
                              >
                                <Button variant="outline" size="sm">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(session)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {session.status === "Active" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openActionDialog(session, "complete")
                                    }
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openActionDialog(session, "cancel")
                                    }
                                    className="text-orange-600 hover:text-orange-700"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(session)}
                                className="text-red-600 hover:text-red-700"
                                disabled={session.status === "Active"}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Create Session Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Create a new Stock Opname session for asset tracking.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sessionName">Session Name</Label>
                  <Input
                    id="sessionName"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="Enter session name"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionYear">Year</Label>
                  <Input
                    id="sessionYear"
                    type="number"
                    value={createForm.year}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, year: e.target.value })
                    }
                    placeholder="Enter year"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionDescription">
                    Description (Optional)
                  </Label>
                  <Input
                    id="sessionDescription"
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSession}
                  disabled={actionLoading === "create"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === "create" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Session Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Session</DialogTitle>
                <DialogDescription>
                  Update session information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editName">Session Name</Label>
                  <Input
                    id="editName"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editYear">Year</Label>
                  <Input
                    id="editYear"
                    type="number"
                    value={editForm.year}
                    onChange={(e) =>
                      setEditForm({ ...editForm, year: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editDescription">Description</Label>
                  <Input
                    id="editDescription"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    placeholder="Enter description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateSession}
                  disabled={actionLoading === "edit"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === "edit" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  Update Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Action Dialog (Complete/Cancel) */}
          <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {actionType === "complete"
                    ? "Complete Session"
                    : "Cancel Session"}
                </DialogTitle>
                <DialogDescription>
                  {actionType === "complete"
                    ? `This will mark the session "${selectedSession?.name}" as completed and update all verified assets to the main asset list.`
                    : `This will cancel the session "${selectedSession?.name}". No assets will be updated.`}
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {actionType === "complete"
                    ? "This action cannot be undone. All verified asset changes will be applied permanently."
                    : "This action cannot be undone. The session will be marked as cancelled."}
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowActionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSessionAction}
                  disabled={actionLoading === actionType}
                  className={
                    actionType === "complete"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  }
                >
                  {actionLoading === actionType ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : actionType === "complete" ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {actionType === "complete"
                    ? "Complete Session"
                    : "Cancel Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Session Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Session</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{selectedSession?.name}"?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will permanently remove the session and all its scanned
                  asset entries from the system.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSession}
                  disabled={actionLoading === "delete"}
                >
                  {actionLoading === "delete" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </RoleBasedAccess>
    </ProtectedRoute>
  );
}
