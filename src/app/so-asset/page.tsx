'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Play, Calendar, CheckCircle, Clock, XCircle, List, Search, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleBasedAccess from '@/components/RoleBasedAccess'
import { useAuth } from '@/contexts/AuthContext'

interface SOSession {
  id: string
  name: string
  year: number
  description?: string
  status: 'Active' | 'Completed' | 'Cancelled'
  totalAssets: number
  scannedAssets: number
  createdAt: string
  startedAt?: string
  completedAt?: string
}

function SOAssetPageContent() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SOSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SOSession | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    description: ''
  })

  const isViewer = user?.role === 'VIEWER'
  const canCreate = user?.role === 'ADMIN'
  const canScan = user?.role === 'ADMIN' || user?.role === 'SO_ASSET_USER'

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    console.log('Fetching SO sessions...')
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        setSessions([])
        setLoading(false)
        return
      }

      const response = await fetch('/api/so-sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Sessions data:', data)
        setSessions(Array.isArray(data) ? data : [])
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch sessions:', errorData)
        setSessions([])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch('/api/so-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({ name: '', year: new Date().getFullYear(), description: '' })
        fetchSessions()
      } else {
        const errorData = await response.json()
        console.error('Failed to create session:', errorData)
      }
    } catch (error) {
      console.error('Error creating SO session:', error)
    }
  }

  const handleCancelSession = async () => {
    if (!selectedSession) return

    setCancelling(true)
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch(`/api/so-sessions/${selectedSession.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setShowCancelDialog(false)
        setSelectedSession(null)
        fetchSessions()
      } else {
        const errorData = await response.json()
        console.error('Failed to cancel session:', errorData)
      }
    } catch (error) {
      console.error('Error cancelling SO session:', error)
    } finally {
      setCancelling(false)
    }
  }

  const openCancelDialog = (session: SOSession) => {
    setSelectedSession(session)
    setShowCancelDialog(true)
  }

  const handleDeleteSession = async () => {
    if (!selectedSession) return

    setDeleting(true)
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch(`/api/so-sessions/${selectedSession.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedSession(null)
        fetchSessions()
      } else {
        const errorData = await response.json()
        console.error('Failed to delete session:', errorData)
      }
    } catch (error) {
      console.error('Error deleting SO session:', error)
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (session: SOSession) => {
    setSelectedSession(session)
    setShowDeleteDialog(true)
  }

  const getProgressPercentage = (scanned: number, total: number) => {
    if (!scanned || !total || total === 0) return 0
    return Math.round((scanned / total) * 100)
  }

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
    )
  }

  const sessionCards = sessions.map((session) => {
    const progress = getProgressPercentage(session.scannedAssets, session.totalAssets)
    const statusClass =
      session.status === 'Active'
        ? 'bg-primary/10 text-primary'
        : session.status === 'Completed'
          ? 'bg-[#ecfdf3] text-[#1a7f5a]'
          : 'bg-[#fff1ed] text-[#c2410c]'
    const progressColor = progress === 100 ? 'bg-[#32c997]' : 'bg-primary'

    return (
      <div key={session.id} className="surface-card p-0">
        <div className="space-y-4 p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {session.name}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <Calendar className="h-3 w-3" />
                <span>{session.year}</span>
              </div>
            </div>
            <span className={`sneat-chip ${statusClass}`}>
              {session.status}
            </span>
          </div>

          {/* Description */}
          {session.description && (
            <p className="text-sm text-text-muted line-clamp-2">
              {session.description}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary/40">
              <div
                className={`h-2 rounded-full ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.25em] text-text-muted">
              <span>{session.scannedAssets} scanned</span>
              <span>{session.totalAssets} total</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-[0.7rem] uppercase tracking-[0.35em] text-text-muted">
            Created {new Date(session.createdAt).toLocaleDateString()}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {session.status === 'Active' && (
              <>
                {canScan ? (
                  <Link href={`/so-asset/${session.id}/scan`} className="flex-1">
                    <button className="sneat-btn sneat-btn-primary w-full justify-center text-xs tracking-[0.2em]">
                      <Search className="h-4 w-4" />
                      Scan Assets
                    </button>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="sneat-btn sneat-btn-outlined flex-1 justify-center text-xs opacity-60"
                    title="Scan access restricted"
                  >
                    <Search className="h-4 w-4" />
                    Scan
                  </button>
                )}
                <RoleBasedAccess allowedRoles={['ADMIN']}>
                  <button
                    onClick={() => openCancelDialog(session)}
                    className="sneat-btn flex items-center justify-center bg-[#fff1ed] text-[#c2410c] border border-[#ffcfc0]"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </RoleBasedAccess>
              </>
            )}
            {session.status === 'Completed' && (
              <Link href={`/so-asset/${session.id}/identified-assets`} className="flex-1">
                <button className="sneat-btn w-full justify-center border border-[#c2f4dd] bg-[#ecfdf3] text-[#1a7f5a] text-xs tracking-[0.2em]">
                  <Eye className="h-4 w-4" />
                  Lihat progres
                </button>
              </Link>
            )}
            {session.status === 'Cancelled' && (
              <>
                <button
                  disabled
                  className="sneat-btn sneat-btn-outlined flex-1 justify-center text-xs opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelled
                </button>
                <RoleBasedAccess allowedRoles={['ADMIN']}>
                  <button
                    onClick={() => openDeleteDialog(session)}
                    className="sneat-btn bg-[#ffefef] text-[#d23a3a] border border-[#ffcfcf]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </RoleBasedAccess>
              </>
            )}
          </div>
        </div>
      </div>
    )
  })

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.6em] text-text-muted">Stock Opname</p>
            <h1 className="text-3xl font-semibold text-foreground">SO Asset Sessions</h1>
            <p className="text-sm text-text-muted">
              Monitor progres scanning dan kelola sesi inventory perusahaan
            </p>
          </div>
          <RoleBasedAccess allowedRoles={['ADMIN']}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="sneat-btn sneat-btn-primary justify-center"
              >
                <Plus className="h-4 w-4" />
                Mulai sesi baru
              </button>
            </div>
          </RoleBasedAccess>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-grid">
          <div className="surface-card">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Total sessions</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{sessions.length}</p>
          </div>
          <div className="surface-card">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Active</p>
            <p className="mt-2 text-3xl font-semibold text-primary">
              {sessions.filter(s => s.status === 'Active').length}
            </p>
          </div>
          <div className="surface-card">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-[#1a7f5a]">
              {sessions.filter(s => s.status === 'Completed').length}
            </p>
          </div>
          <div className="surface-card">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Cancelled</p>
            <p className="mt-2 text-3xl font-semibold text-[#d23a3a]">
              {sessions.filter(s => s.status === 'Cancelled').length}
            </p>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="surface-card text-center">
            <List className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Belum ada sesi stock opname</h3>
            <p className="text-sm text-text-muted">
              Buat sesi pertama untuk mulai memindai dan merekonsiliasi aset.
            </p>
            <RoleBasedAccess allowedRoles={['ADMIN']}>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="mt-6 sneat-btn sneat-btn-primary inline-flex min-w-[200px] justify-center"
              >
                <Plus className="h-4 w-4" />
                Mulai sesi sekarang
              </button>
            </RoleBasedAccess>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {sessionCards}
          </div>
        )}      {/* Cancel Session Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Stock Opname Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this stock opname session?
              This will delete all scanned assets and cannot be undone.
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
                  <div>Progress: {getProgressPercentage(selectedSession.scannedAssets, selectedSession.totalAssets)}%</div>
                </div>
              </div>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. All scanned assets will be deleted and the session will be cancelled.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                  No, Keep Session
                </Button>
                <Button variant="destructive" onClick={handleCancelSession} disabled={cancelling}>
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and scope of this stock opname session..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
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
              Are you sure you want to permanently delete this cancelled stock opname session?
              This action cannot be undone.
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
                  <div>Created: {new Date(selectedSession.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <Alert variant="destructive">
                <Trash2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will permanently delete the session and all its data. This action cannot be undone.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteSession} disabled={deleting}>
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
          <p className="text-xs mt-1">You can view SO Asset progress but cannot make changes.</p>
        </div>
      )}
    </div>
    </div>
  )
}

export default function SOAssetPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SO_ASSET_USER', 'VIEWER']}>
      <SOAssetPageContent />
    </ProtectedRoute>
  )
}






