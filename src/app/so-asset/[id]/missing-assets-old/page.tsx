'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Eye
} from 'lucide-react'
import Link from 'next/link'

interface Asset {
  id: string
  noAsset: string
  name: string
  status: string
  serialNo?: string
  pic?: string | null
  imageUrl?: string | null
  brand?: string
  model?: string
  cost?: number
  site?: { name: string }
  category?: { name: string }
  department?: { name: string }
}

interface ScannedEntry {
  id: string
  assetId: string
  isIdentified: boolean
  isCrucial?: boolean
  crucialNotes?: string | null
  scannedAt: string
  asset: Asset
}

interface MissingAssetsResponse {
  session: {
    id: string
    name: string
    year: number
    status: string
    totalAssets: number
    scannedAssets: number
  }
  statistics: {
    totalAssets: number
    scannedAssets: number
    missingAssets: number
    identifiedAssets: number
    unidentifiedAssets: number
    completionPercentage: number
    identificationPercentage: number
  }
  missingAssets: Asset[]
  groupedBy: {
    site: Record<string, Asset[]>
    category: Record<string, Asset[]>
    department: Record<string, Asset[]>
  }
  scannedEntries: ScannedEntry[]
}

export default function MissingAssetsPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<MissingAssetsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (params.id) {
      fetchMissingAssets()
    }
  }, [params.id])

  const fetchMissingAssets = async () => {
    try {
      const response = await fetch(`/api/so-sessions/${params.id}/missing-assets`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        toast.error('Failed to fetch missing assets')
      }
    } catch (error) {
      console.error('Error fetching missing assets:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredMissingAssets = data?.missingAssets.filter(asset =>
    asset.noAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.pic?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const getGroupedAssets = () => {
    if (!data) return {}

    switch (activeTab) {
      case 'site':
        return data.groupedBy.site
      case 'category':
        return data.groupedBy.category
      case 'department':
        return data.groupedBy.department
      default:
        return { 'All Missing Assets': data.missingAssets }
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
            <p>Loading missing assets...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load missing assets data</AlertDescription>
        </Alert>
      </div>
    )
  }

  const groupedAssets = getGroupedAssets()

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/so-asset/${params.id}/scan`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scan
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Missing Assets</h1>
          <p className="text-muted-foreground">
            Assets that haven't been scanned yet in {data.session.name}
          </p>
        </div>
        <Badge variant={data.session.status === 'Active' ? 'default' : 'secondary'}>
          {data.session.status}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              All assets in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scanned Assets</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.scannedAssets}</div>
            <p className="text-xs text-muted-foreground">
              {data.statistics.completionPercentage}% completed
            </p>
            <Progress value={data.statistics.completionPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Assets</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.statistics.missingAssets}</div>
            <p className="text-xs text-muted-foreground">
              {((data.statistics.missingAssets / data.statistics.totalAssets) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Identified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.statistics.identifiedAssets}</div>
            <p className="text-xs text-muted-foreground">
              {data.statistics.identificationPercentage}% of scanned
            </p>
            <Progress value={data.statistics.identificationPercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Missing Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-orange-600" />
            Missing Assets ({filteredMissingAssets.length})
          </CardTitle>
          <CardDescription>
            These assets haven't been scanned yet. Continue scanning to complete the stock opname.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMissingAssets.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No assets found' : 'All assets have been scanned! 🎉'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Great job! You\'ve scanned all assets.'}
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="site">
                  <Building className="h-4 w-4 mr-1" />
                  By Site
                </TabsTrigger>
                <TabsTrigger value="category">
                  <Tag className="h-4 w-4 mr-1" />
                  By Category
                </TabsTrigger>
                <TabsTrigger value="department">
                  <Users className="h-4 w-4 mr-1" />
                  By Department
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {Object.entries(groupedAssets).map(([groupName, assets]) => {
                  const filteredGroupAssets = assets.filter(asset =>
                    asset.noAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.pic?.toLowerCase().includes(searchQuery.toLowerCase())
                  )

                  if (filteredGroupAssets.length === 0) return null

                  return (
                    <div key={groupName} className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-muted-foreground">
                        {groupName} ({filteredGroupAssets.length})
                      </h3>
                      <div className="space-y-3">
                        {filteredGroupAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between p-4 border-l-4 border-l-orange-500 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-medium text-lg">{asset.noAsset}</span>
                                <Badge variant="outline" className={getStatusColor(asset.status)}>
                                  {asset.status}
                                </Badge>
                              </div>
                              <h4 className="font-medium mb-2">{asset.name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Serial:</span> {asset.serialNo || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Brand:</span> {asset.brand || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Model:</span> {asset.model || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">PIC:</span> {asset.pic || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Site:</span> {asset.site?.name || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Category:</span> {asset.category?.name || 'N/A'}
                                </div>
                              </div>
                              {asset.cost && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Cost:</span> Rp {asset.cost.toLocaleString('id-ID')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
