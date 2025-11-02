'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Play, Calendar, CheckCircle, Clock, XCircle, List, Search, Trash2 } from 'lucide-react'
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

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    console.log('Fetching SO sessions...')
    try {
      const response = await fetch('/api/so-sessions')
      console.log('Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Sessions data:', data)
        setSessions(Array.isArray(data) ? data : [])
      } else {
        console.log('Failed to fetch sessions')
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
      const response = await fetch('/api/so-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({ name: '', year: new Date().getFullYear(), description: '' })
        fetchSessions()
      }
    } catch (error) {
      console.error('Error creating SO session:', error)
    }
  }

  const handleCancelSession = async () => {
    if (!selectedSession) return

    setCancelling(true)
    try {
      const response = await fetch(`/api/so-sessions/${selectedSession.id}/cancel`, {
        method: 'POST'
      })

      if (response.ok) {
        setShowCancelDialog(false)
        setSelectedSession(null)
        fetchSessions()
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
      const response = await fetch(`/api/so-sessions/${selectedSession.id}/delete`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedSession(null)
        fetchSessions()
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

  const getStatusBadge = (status: string) => {
    const variants = {
      Active: 'default',
      Completed: 'secondary',
      Cancelled: 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    )
  }

  const getProgressPercentage = (scanned: number, total: number) => {
    if (!scanned || !total || total === 0) return 0
    return Math.round((scanned / total) * 100)
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 w-64"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">STOCK OPNAME</h1>
            <p className="text-gray-600 text-sm">Manage asset tracking and inventory sessions</p>
          </div>
          <button
            onClick={() => {
              console.log('Button clicked')
              setShowCreateDialog(true)
            }}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            START NEW SESSION
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-300 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">TOTAL SESSIONS</div>
            <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
          </div>
          <div className="bg-white border border-gray-300 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">ACTIVE</div>
            <div className="text-2xl font-bold text-blue-600">
              {sessions.filter(s => s.status === 'Active').length}
            </div>
          </div>
          <div className="bg-white border border-gray-300 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">COMPLETED</div>
            <div className="text-2xl font-bold text-green-600">
              {sessions.filter(s => s.status === 'Completed').length}
            </div>
          </div>
          <div className="bg-white border border-gray-300 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">CANCELLED</div>
            <div className="text-2xl font-bold text-red-600">
              {sessions.filter(s => s.status === 'Cancelled').length}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
            <h2 className="text-sm font-bold text-white">NO SESSIONS FOUND</h2>
          </div>
          <div className="p-12 text-center">
            <List className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Stock Opname Sessions</h3>
            <p className="text-gray-600 text-sm mb-6">
              Create your first stock opname session to start tracking assets
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              START FIRST SESSION
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white border border-gray-300">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {session.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{session.year}</span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs font-bold border ${
                    session.status === 'Active'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : session.status === 'Completed'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {session.status}
                  </div>
                </div>

                {/* Description */}
                {session.description && (
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                    {session.description}
                  </p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-700">PROGRESS</span>
                    <span className="text-xs font-bold text-gray-900">
                      {getProgressPercentage(session.scannedAssets, session.totalAssets)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 border border-gray-300 h-4">
                    <div
                      className={`h-4 border ${
                        getProgressPercentage(session.scannedAssets, session.totalAssets) === 100
                          ? 'bg-green-600 border-green-700'
                          : 'bg-blue-600 border-blue-700'
                      }`}
                      style={{ width: `${getProgressPercentage(session.scannedAssets, session.totalAssets)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      {session.scannedAssets} scanned
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.totalAssets} total
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500 mb-4">
                  Created: {new Date(session.createdAt).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {session.status === 'Active' && (
                    <>
                      <Link href={`/so-asset/${session.id}/scan`} className="flex-1">
                        <button className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 text-xs font-medium">
                          <Search className="h-3 w-3 mr-1" />
                          SCAN
                        </button>
                      </Link>
                      <RoleBasedAccess allowedRoles={['ADMIN']}>
                        <button
                          onClick={() => openCancelDialog(session)}
                          className="flex items-center justify-center px-3 py-2 bg-red-600 text-white border border-red-700 hover:bg-red-700 text-xs font-medium"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </RoleBasedAccess>
                    </>
                  )}
                  {session.status === 'Completed' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center px-3 py-2 bg-gray-300 text-gray-500 border border-gray-400 text-xs font-medium cursor-not-allowed"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      COMPLETED
                    </button>
                  )}
                  {session.status === 'Cancelled' && (
                    <>
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-300 text-gray-500 border border-gray-400 text-xs font-medium cursor-not-allowed"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        CANCELLED
                      </button>
                      <RoleBasedAccess allowedRoles={['ADMIN']}>
                        <button
                          onClick={() => openDeleteDialog(session)}
                          className="flex items-center justify-center px-3 py-2 bg-red-600 text-white border border-red-700 hover:bg-red-700 text-xs font-medium"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </RoleBasedAccess>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Session Dialog */}
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
    </div>
  )
}

export default function SOAssetPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SO_ASSET_USER']}>
      <SOAssetPageContent />
    </ProtectedRoute>
  )
}
