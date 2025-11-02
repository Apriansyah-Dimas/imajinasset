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
    site?: { name: string }
    category?: { name: string }
    department?: { name: string }
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

export default function IdentifiedAssetsPage() {
  const params = useParams()
  const router = useRouter()
  const [session, setSession] = useState<SOSession | null>(null)
  const [scannedAssets, setScannedAssets] = useState<SOAssetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

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
    isIdentified: false
  })

  useEffect(() => {
    if (params.id) {
      fetchSession()
      fetchScannedAssets()
    }
  }, [params.id])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/so-sessions/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    }
  }

  const fetchScannedAssets = async () => {
    try {
      const response = await fetch(`/api/so-sessions/${params.id}/entries`)
      if (response.ok) {
        const data = await response.json()
        setScannedAssets(data)
      }
    } catch (error) {
      console.error('Error fetching scanned assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditAsset = (asset: SOAssetEntry) => {
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
      isIdentified: asset.isIdentified
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAsset) return

    try {
      const response = await fetch(`/api/so-sessions/${params.id}/entries/${selectedAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        setShowEditDialog(false)
        setSelectedAsset(null)
        fetchScannedAssets()
      }
    } catch (error) {
      console.error('Error updating asset:', error)
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
                <Label>Asset Number</Label>
                <Input value={selectedAsset.asset.noAsset} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempName">Asset Name</Label>
                <Input
                  id="tempName"
                  value={editForm.tempName}
                  onChange={(e) => setEditForm({ ...editForm, tempName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempStatus">Status</Label>
                <Select value={editForm.tempStatus} onValueChange={(value) => setEditForm({ ...editForm, tempStatus: value })}>
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempPic">PIC</Label>
                <Input
                  id="tempPic"
                  value={editForm.tempPic}
                  onChange={(e) => setEditForm({ ...editForm, tempPic: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempBrand">Brand</Label>
                <Input
                  id="tempBrand"
                  value={editForm.tempBrand}
                  onChange={(e) => setEditForm({ ...editForm, tempBrand: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempModel">Model</Label>
                <Input
                  id="tempModel"
                  value={editForm.tempModel}
                  onChange={(e) => setEditForm({ ...editForm, tempModel: e.target.value })}
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tempNotes">Notes</Label>
                <Textarea
                  id="tempNotes"
                  value={editForm.tempNotes}
                  onChange={(e) => setEditForm({ ...editForm, tempNotes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Mark as Identified Checkbox */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox
                  id="isIdentified"
                  checked={editForm.isIdentified}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isIdentified: checked as boolean })}
                />
                <Label htmlFor="isIdentified" className="text-sm font-medium">
                  Mark as Identified
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
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
