'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  Clock,
  Search,
  ArrowLeft,
  Edit,
  Save,
  X,
  Package,
  Tag,
  Building,
  Users,
  CheckCheck
} from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

interface SOAssetEntry {
  id: string
  assetId: string
  scannedAt: string
  status: string
  isIdentified: boolean
  tempName?: string
  tempStatus?: string
  tempSerialNo?: string
  tempPic?: string
  tempNotes?: string
  tempBrand?: string
  tempModel?: string
  tempCost?: number
  asset: {
    id: string
    noAsset: string
    name: string
    status: string
    serialNo?: string
    pic?: string
    brand?: string
    model?: string
    cost?: number
    site?: { id: string; name: string }
    category?: { id: string; name: string }
    department?: { id: string; name: string }
  }
}

interface SOSession {
  id: string
  name: string
  year: number
  status: string
  totalAssets: number
  scannedAssets: number
}

function IdentifiedAssetsPageContent() {
  const params = useParams()
  const router = useRouter()
  const [session, setSession] = useState<SOSession | null>(null)
  const [scannedAssets, setScannedAssets] = useState<SOAssetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [sites, setSites] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [pics, setPics] = useState<any[]>([])

  // Edit dialog states
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<SOAssetEntry | null>(null)
  const [editForm, setEditForm] = useState({
    tempName: '',
    tempStatus: '',
    tempSerialNo: '',
    tempPic: '',
    tempNotes: '',
    tempBrand: '',
    tempModel: '',
    tempCost: '',
    tempSiteId: '',
    tempCategoryId: '',
    tempDepartmentId: '',
    isIdentified: false
  })

  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SO_ASSET_USER'

  useEffect(() => {
    if (params.id) {
      fetchSession()
      fetchScannedAssets()
      fetchMasterData()
    }
  }, [params.id])

  const fetchMasterData = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [sitesRes, categoriesRes, departmentsRes, picsRes] = await Promise.all([
        fetch('/api/sites', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/departments', { headers }),
        fetch('/api/pics', { headers })
      ])

      if (sitesRes.ok) setSites(await sitesRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (departmentsRes.ok) setDepartments(await departmentsRes.json())
      if (picsRes.ok) setPics(await picsRes.json())
    } catch (error) {
      console.error('Error fetching master data:', error)
    }
  }

  const fetchSession = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch session:', errorData)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    }
  }

  const fetchScannedAssets = async () => {
    try {
      console.log('DEBUG: identified-assets - Starting fetch for session:', params.id)
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        setScannedAssets([])
        setLoading(false)
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/entries`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: identified-assets - API response:', data)
        console.log('DEBUG: identified-assets - First entry tempStatus:', data.entries?.[0]?.tempStatus)
        console.log('DEBUG: identified-assets - First entry tempName:', data.entries?.[0]?.tempName)
        
        // Handle both direct array and wrapped response
        if (Array.isArray(data)) {
          setScannedAssets(data)
        } else if (Array.isArray(data.entries)) {
          setScannedAssets(data.entries)
        } else {
          console.log('DEBUG: identified-assets - No array found in response')
          setScannedAssets([])
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch scanned assets:', errorData)
        setScannedAssets([])
      }
    } catch (error) {
      console.error('DEBUG: identified-assets - Error fetching scanned assets:', error)
      setScannedAssets([])
    } finally {
      setLoading(false)
    }
  }

  const handleEditAsset = (asset: SOAssetEntry) => {
    if (!canEdit) {
      alert('You do not have permission to edit assets')
      return
    }
    
    setSelectedAsset(asset)
    setEditForm({
      tempName: asset.tempName || asset.asset.name,
      tempStatus: asset.tempStatus || asset.asset.status,
      tempSerialNo: asset.tempSerialNo || asset.asset.serialNo || '',
      tempPic: asset.tempPic || asset.asset.pic || '',
      tempNotes: asset.tempNotes || '',
      tempBrand: asset.tempBrand || asset.asset.brand || '',
      tempModel: asset.tempModel || asset.asset.model || '',
      tempCost: asset.tempCost?.toString() || asset.asset.cost?.toString() || '',
      tempSiteId: asset.asset.site?.id || '',
      tempCategoryId: asset.asset.category?.id || '',
      tempDepartmentId: asset.asset.department?.id || '',
      isIdentified: asset.isIdentified
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAsset) return

    try {
      console.log('DEBUG: identified-assets - editForm before sending:', editForm)
      console.log('DEBUG: identified-assets - tempStatus value:', editForm.tempStatus)
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/entries/${selectedAsset.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log('DEBUG: identified-assets - API response successful:', data)
        console.log('DEBUG: identified-assets - Updated entry tempStatus:', data.entry?.tempStatus)
        setShowEditDialog(false)
        setSelectedAsset(null)
        
        // Force refresh with delay
        setTimeout(() => {
          fetchScannedAssets()
        }, 500)
      } else {
        console.error('DEBUG: identified-assets - Save failed:', data)
      }
    } catch (error) {
      console.error('DEBUG: identified-assets - Error updating asset:', error)
    }
  }

  const identifiedAssets = scannedAssets.filter(entry => entry.isIdentified)
  const filteredAssets = identifiedAssets.filter(entry =>
    entry.asset.noAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.asset.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.tempName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getGroupedAssets = () => {
    if (filteredAssets.length === 0) return {}

    switch (activeTab) {
      case 'site':
        return filteredAssets.reduce((acc, asset) => {
          const siteName = asset.asset.site?.name || 'Unknown Site'
          if (!acc[siteName]) acc[siteName] = []
          acc[siteName].push(asset)
          return acc
        }, {} as Record<string, typeof filteredAssets>)
      case 'category':
        return filteredAssets.reduce((acc, asset) => {
          const categoryName = asset.asset.category?.name || 'Unknown Category'
          if (!acc[categoryName]) acc[categoryName] = []
          acc[categoryName].push(asset)
          return acc
        }, {} as Record<string, typeof filteredAssets>)
      case 'department':
        return filteredAssets.reduce((acc, asset) => {
          const departmentName = asset.asset.department?.name || 'Unknown Department'
          if (!acc[departmentName]) acc[departmentName] = []
          acc[departmentName].push(asset)
          return acc
        }, {} as Record<string, typeof filteredAssets>)
      default:
        return { 'All Identified Assets': filteredAssets }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Broken':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Maintenance Process':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Lost/Missing':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Sell':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading identified assets...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Session not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const groupedAssets = getGroupedAssets()

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/so-asset/${params.id}/scan`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scan
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Scanned Assets</h1>
            <p className="text-muted-foreground">{session.name} • {session.year}</p>
          </div>
          <Badge variant={session.status === 'Active' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Verification Progress</h3>
              <p className="text-sm text-muted-foreground">
                {identifiedAssets.length} of {scannedAssets.length} assets verified
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {scannedAssets.length > 0 ? Math.round((identifiedAssets.length / scannedAssets.length) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
          </div>
          <Progress
            value={scannedAssets.length > 0 ? (identifiedAssets.length / scannedAssets.length) * 100 : 0}
            className="mt-4"
          />
        </CardContent>
      </Card>

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

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scanned assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Asset List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Verified Assets</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {filteredAssets.length} assets
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <h3 className="text-lg font-medium mb-1">
                    {searchQuery ? 'No assets found' : 'No verified assets yet'}
                  </h3>
                  <p className="text-sm">
                    {searchQuery ? 'Try adjusting your search terms' : 'Edit scanned assets to mark them as verified'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredAssets.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        entry.isIdentified
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium truncate">{entry.asset.noAsset}</span>
                          <Badge
                            variant={entry.isIdentified ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {entry.isIdentified ? "Verified" : "Pending"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {entry.tempStatus || entry.asset.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {entry.tempName || entry.asset.name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Site: {entry.asset.site?.name || 'N/A'}</span>
                          <span>PIC: {entry.tempPic || entry.asset.pic || 'N/A'}</span>
                          {entry.tempNotes && (
                            <span className="text-blue-600">Has notes</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAsset(entry)}
                        disabled={!canEdit}
                        title={canEdit ? "Edit asset" : "You don't have permission to edit"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCheck className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <div className="text-xl font-bold">{identifiedAssets.length}</div>
                  <div className="text-xs text-muted-foreground">Verified</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-700" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {scannedAssets.filter(entry => !entry.isIdentified).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-xl font-bold">{scannedAssets.length}</div>
                  <div className="text-xs text-muted-foreground">Total Scanned</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Link href={`/so-asset/${params.id}/scan`}>
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Scanner
                  </Button>
                </Link>
                <Link href={`/so-asset/${params.id}/unidentified-assets`}>
                  <Button variant="outline" className="w-full">
                    <Package className="h-4 w-4 mr-2" />
                    View Remaining
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset information for this stock opname session
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="tempName">Asset Name</Label>
                <Input
                  id="tempName"
                  value={editForm.tempName}
                  onChange={(e) => setEditForm({ ...editForm, tempName: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempSiteId">Site</Label>
                <Select value={editForm.tempSiteId} onValueChange={(value) => setEditForm({ ...editForm, tempSiteId: value })} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site: any) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempCategoryId">Category</Label>
                <Select value={editForm.tempCategoryId} onValueChange={(value) => setEditForm({ ...editForm, tempCategoryId: value })} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempStatus">Status</Label>
                <Select value={editForm.tempStatus} onValueChange={(value) => setEditForm({ ...editForm, tempStatus: value })} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unidentified">Unidentified</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Broken">Broken</SelectItem>
                    <SelectItem value="Lost/Missing">Lost/Missing</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempSerialNo">Serial Number</Label>
                <Input
                  id="tempSerialNo"
                  value={editForm.tempSerialNo}
                  onChange={(e) => setEditForm({ ...editForm, tempSerialNo: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempPic">PIC</Label>
                <Input
                  id="tempPic"
                  value={editForm.tempPic}
                  onChange={(e) => setEditForm({ ...editForm, tempPic: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempBrand">Brand</Label>
                <Input
                  id="tempBrand"
                  value={editForm.tempBrand}
                  onChange={(e) => setEditForm({ ...editForm, tempBrand: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempModel">Model</Label>
                <Input
                  id="tempModel"
                  value={editForm.tempModel}
                  onChange={(e) => setEditForm({ ...editForm, tempModel: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempCost">Cost</Label>
                <Input
                  id="tempCost"
                  type="number"
                  step="0.01"
                  value={editForm.tempCost}
                  onChange={(e) => setEditForm({ ...editForm, tempCost: e.target.value })}
                  placeholder="0.00"
                  disabled={!canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempNotes">Notes</Label>
                <Textarea
                  id="tempNotes"
                  value={editForm.tempNotes}
                  onChange={(e) => setEditForm({ ...editForm, tempNotes: e.target.value })}
                  rows={3}
                  disabled={!canEdit}
                />
              </div>

              {/* Mark as Identified Checkbox */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox
                  id="isIdentified"
                  checked={editForm.isIdentified}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isIdentified: checked as boolean })}
                  disabled={!canEdit}
                />
                <Label htmlFor="isIdentified" className="text-sm font-medium">
                  Mark as Identified
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={!canEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function IdentifiedAssetsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SO_ASSET_USER', 'VIEWER']}>
      <IdentifiedAssetsPageContent />
    </ProtectedRoute>
  )
}
