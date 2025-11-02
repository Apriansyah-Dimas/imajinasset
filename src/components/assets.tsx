'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Settings, Eye, Package, Upload, Search, Trash2 } from 'lucide-react'
import AssetDetailModal from '@/components/asset-detail-modal'
import AddAssetModal from '@/components/add-asset-modal'
import EditDropdownsModal from '@/components/edit-dropdowns-modal'
import ImportAssetsModal from '@/components/import-assets-modal'
import AssetImagePlaceholder from '@/components/asset-image-placeholder'
import { toast } from 'sonner'
import BackupManagerPanel from '@/components/backup-manager-panel'

interface Asset {
  id: string
  name: string
  noAsset: string
  status: string
  serialNo?: string
  purchaseDate?: string
  cost?: number
  brand?: string
  model?: string
  site?: { id: string; name: string }
  category?: { id: string; name: string }
  department?: { id: string; name: string }
  pic?: string | null
  picId?: string | null
  imageUrl?: string | null
  notes?: string | null
  employee?: {
    id: string
    employeeId: string
    name: string
    email?: string
    department?: string
    position?: string
    isActive?: boolean
  } | null
  dateCreated: string
}

const toSearchTokens = (value: unknown): string[] => {
  if (value === null || value === undefined) return []

  if (typeof value === 'string') return [value.toLowerCase()]
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value).toLowerCase()]
  }
  if (value instanceof Date) return [value.toISOString().toLowerCase()]

  if (Array.isArray(value)) {
    return value.flatMap(toSearchTokens)
  }

  if (typeof value === 'object') {
    return Object.values(value).flatMap(toSearchTokens)
  }

  return []
}

// Collect relevant asset properties (including nested data) into a flat list of normalized strings for searching.
const buildAssetSearchTokens = (asset: Asset): string[] => {
  const baseValues: unknown[] = [
    asset.id,
    asset.name,
    asset.noAsset,
    asset.status,
    asset.serialNo,
    asset.purchaseDate,
    asset.brand,
    asset.model,
    asset.pic,
    asset.picId,
    asset.imageUrl,
    asset.dateCreated,
    asset.cost,
    asset.site?.name,
    asset.site?.id,
    asset.category?.name,
    asset.category?.id,
    asset.department?.name,
    asset.department?.id,
    asset.notes
  ]

  const employeeValues: unknown[] = asset.employee
    ? [
        asset.employee.id,
        asset.employee.employeeId,
        asset.employee.name,
        asset.employee.email,
        asset.employee.department,
        asset.employee.position,
        asset.employee.isActive
      ]
    : []

  const additionalNoteTokens: unknown[] = []
  if (asset.notes) {
    try {
      const parsedNotes = JSON.parse(asset.notes)
      additionalNoteTokens.push(
        ...Object.entries(parsedNotes).flatMap(([key, value]) => [key, value])
      )
    } catch {
      // notes might be plain text; already included in baseValues
    }
  }

  return toSearchTokens([...baseValues, ...employeeValues, ...additionalNoteTokens])
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDropdownsModal, setShowDropdownsModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingAll, setDeletingAll] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)
  const lastAssetElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (loadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreAssets()
      }
    })
    if (node) observer.current.observe(node)
  }, [loadingMore, hasMore])
  const assetSearchIndex = useMemo(
    () => assets.map(asset => ({ asset, tokens: buildAssetSearchTokens(asset) })),
    [assets]
  )

  const loadAssets = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      // Load ALL assets without limit to handle 1000+ assets
      const response = await fetch(`/api/assets?limit=10000`) // Set very high limit for all assets
      const data = await response.json()
      
      console.log('Assets API Response:', {
        total: data.total,
        assetsCount: data.assets.length,
        limit: data.limit
      });

      let updatedAssets: Asset[] = []
      setAssets(prevAssets => {
        updatedAssets = append ? [...prevAssets, ...data.assets] : data.assets
        return updatedAssets
      })

      if (searchQuery.trim() === '') {
        setFilteredAssets(updatedAssets)
      }

      // Since we're loading all assets at once, there's no more to load
      setHasMore(false)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreAssets = () => {
    if (!loadingMore && hasMore) {
      loadAssets(page + 1, true)
    }
  }

  const refreshAssets = () => {
    loadAssets(1, false)
  }

  const handleDeleteAllAssets = async () => {
    setDeletingAll(true)
    try {
      const response = await fetch('/api/assets/delete-all', {
        method: 'DELETE'
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.success) {
        const errorMessage = data?.error || 'Failed to delete assets.'
        toast.error(errorMessage)
        return
      }

      const deletedCount = data?.deleted ?? 0
      toast.success(`Deleted ${deletedCount} asset${deletedCount === 1 ? '' : 's'}.`)

      setSelectedAsset(null)
      setShowDetailModal(false)
      setAssets([])
      setFilteredAssets([])
      setHasMore(false)
      setPage(1)
      refreshAssets()
    } catch (error) {
      console.error('Failed to delete all assets:', error)
      toast.error('Failed to delete assets. Please try again.')
    } finally {
      setDeletingAll(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (normalizedQuery === '') {
      setFilteredAssets(assets)
      return
    }

    const filtered = assetSearchIndex
      .filter(entry => entry.tokens.some(token => token.includes(normalizedQuery)))
      .map(entry => entry.asset)

    setFilteredAssets(filtered)
  }, [searchQuery, assets, assetSearchIndex])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-primary/10 text-primary border-2 border-primary/60'
      case 'Broken': return 'bg-destructive/10 text-destructive border-2 border-destructive/60'
      case 'Maintenance Process': return 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
      case 'Lost/Missing': return 'bg-accent/20 text-accent-foreground border-2 border-accent/60'
      case 'Sell': return 'bg-secondary/10 text-secondary-foreground border-2 border-secondary/60'
      default: return 'bg-muted text-muted-foreground border-2 border-border'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-card border-2 border-border shadow-xl">
          <div className="bg-primary text-primary-foreground px-6 py-4 border-b-2 border-primary/90">
            <h2 className="text-xl font-bold">ASSET LIST</h2>
          </div>
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold w-1/2">Name of Asset</TableHead>
                  <TableHead className="font-bold w-5/12">No Asset</TableHead>
                  <TableHead className="font-bold w-1/12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted-foreground rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                ASSET MANAGEMENT
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage company assets and tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      <BackupManagerPanel className="mb-4 sm:mb-6" />

      {/* Search Bar */}
      <div className="bg-white border-2 border-gray-200 shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 gap-4">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search assets by name, number, category, status, PIC, site, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 sm:py-3 border-2 border-input focus:border-primary font-medium text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full lg:w-auto">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              ADD ASSET
            </Button>
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-bold py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              IMPORT
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDropdownsModal(true)}
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white font-bold py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base w-full sm:w-auto"
            >
              <Settings className="h-4 w-4 mr-1 sm:mr-2" />
              EDIT DROPDOWNS
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="font-bold py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base w-full sm:w-auto"
                  disabled={deletingAll || assets.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
                  DELETE ALL
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all assets?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete every asset record. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllAssets}
                    disabled={deletingAll}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingAll ? 'Deleting...' : 'Delete All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white border-2 border-gray-200 shadow-xl overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-primary/90">
          <h2 className="text-lg sm:text-xl font-bold">ASSET LIST</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                <TableHead className="font-bold py-3 sm:py-4 px-2 sm:px-4 text-left text-xs sm:text-sm w-1/2 bg-gray-100"
                            style={{ maxWidth: '200px', minWidth: '150px', color: '#1f2937' }}>
                  NAME OF ASSET
                </TableHead>
                <TableHead className="font-bold py-3 sm:py-4 px-2 sm:px-4 text-left text-xs sm:text-sm hidden md:table-cell w-5/12 max-w-xs sm:max-w-sm bg-gray-100"
                            style={{ color: '#1f2937' }}>
                  NO ASSET
                </TableHead>
                <TableHead className="font-bold py-3 sm:py-4 px-2 sm:px-4 text-center text-xs sm:text-sm w-1/12 min-w-[80px] bg-gray-100"
                            style={{ color: '#1f2937' }}>
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset, index) => (
                <TableRow
                  key={asset.id}
                  ref={index === filteredAssets.length - 1 ? lastAssetElementRef : null}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <TableCell className="font-medium py-3 sm:py-4 px-2 sm:px-4 w-1/2"
                             style={{ maxWidth: '200px', minWidth: '150px' }}>
                    <div className="flex items-start space-x-2 sm:space-x-3"
                         style={{ width: '100%', overflow: 'hidden' }}>
                      <div className="flex-shrink-0">
                        {asset.imageUrl ? (
                          <img
                            src={asset.imageUrl}
                            alt={asset.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-gray-200 object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.querySelector('[data-placeholder]') as HTMLElement | null
                              if (fallback) fallback.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div
                          data-placeholder
                          className={asset.imageUrl ? 'hidden' : ''}
                        >
                          <AssetImagePlaceholder size="sm" />
                        </div>
                      </div>
                      <div style={{
                        flex: 1,
                        minWidth: 0,
                        maxWidth: '100%',
                        overflow: 'hidden'
                      }}>
                        <div className="font-bold text-gray-900 text-sm sm:text-base leading-tight"
                             style={{
                               wordWrap: 'break-word',
                               overflowWrap: 'anywhere',
                               wordBreak: 'break-word',
                               hyphens: 'auto',
                               maxWidth: '100%',
                               display: 'block'
                             }}>
                          {asset.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1 leading-tight"
                             style={{
                               wordWrap: 'break-word',
                               overflowWrap: 'anywhere',
                               wordBreak: 'break-word',
                               hyphens: 'auto',
                               maxWidth: '100%',
                               display: 'block'
                             }}>
                          {asset.category?.name}
                        </div>
                        {/* Mobile-only asset number and status */}
                        <div className="md:hidden mt-1 space-y-1">
                          <div className="font-mono text-xs text-foreground font-bold leading-tight"
                               style={{
                                 wordWrap: 'break-word',
                                 overflowWrap: 'anywhere',
                                 wordBreak: 'break-word',
                                 hyphens: 'auto',
                                 maxWidth: '100%',
                                 display: 'block'
                               }}>
                            {asset.noAsset}
                          </div>
                          <div>
                            <Badge className={`text-xs font-bold ${getStatusColor(asset.status)}`}>
                              {asset.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {/* Desktop-only asset number and status */}
                  <TableCell className="py-3 sm:py-4 px-2 sm:px-4 hidden md:table-cell w-5/12 max-w-xs sm:max-w-sm">
                    <div className="font-mono text-sm text-foreground font-bold break-words">{asset.noAsset}</div>
                    <div className="mt-1">
                      <Badge className={`text-xs font-bold ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 sm:py-4 px-2 sm:px-4 text-center w-1/12 min-w-[80px]">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowDetailModal(true)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold border-2 border-blue-700 shadow-lg"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Loading More */}
          {loadingMore && (
            <div className="p-3 sm:p-4 space-y-2 border-t-2 border-gray-200">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-2 sm:space-x-4">
                  <Skeleton className="h-3 w-24 sm:h-4 sm:w-48" />
                  <Skeleton className="h-3 w-12 sm:h-4 sm:w-24 hidden sm:block" />
                  <Skeleton className="h-6 w-12 sm:h-8 sm:w-16" />
                </div>
              ))}
            </div>
          )}

          {/* No More Assets */}
          {!hasMore && filteredAssets.length > 0 && (
            <div className="p-3 sm:p-4 text-center text-gray-600 font-medium border-t-2 border-gray-200 bg-gray-50 text-sm sm:text-base">
              NO MORE ASSETS TO LOAD
            </div>
          )}

          {/* Empty State */}
          {filteredAssets.length === 0 && !loading && (
            <div className="p-8 sm:p-12 text-center">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {searchQuery.trim() !== '' ? 'NO ASSETS FOUND' : 'NO ASSETS FOUND'}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                {searchQuery.trim() !== ''
                  ? `No assets found matching "${searchQuery}"`
                  : 'Get started by adding your first asset'
                }
              </p>
              {searchQuery.trim() === '' && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  ADD FIRST ASSET
                </Button>
              )}
              {searchQuery.trim() !== '' && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white font-bold py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base"
                >
                  CLEAR SEARCH
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border-2 border-gray-200 shadow-xl p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">TOTAL ASSETS</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{filteredAssets.length}</div>
        </div>
        <div className="bg-white border-2 border-gray-200 shadow-xl p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">ACTIVE</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {filteredAssets.filter(a => a.status === 'Active').length}
          </div>
        </div>
        <div className="bg-white border-2 border-gray-200 shadow-xl p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">INACTIVE</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {filteredAssets.filter(a => a.status !== 'Active').length}
          </div>
        </div>
        <div className="bg-white border-2 border-gray-200 shadow-xl p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">CATEGORIES</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            {new Set(filteredAssets.map(a => a.category?.name).filter(Boolean)).size}
          </div>
        </div>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        asset={selectedAsset}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={refreshAssets}
      />

      {/* Add Asset Modal */}
      <AddAssetModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={refreshAssets}
      />

      {/* Bulk Add Modal removed; using Import page instead */}

      {/* Edit Dropdowns Modal */}
      <EditDropdownsModal
        open={showDropdownsModal}
        onOpenChange={setShowDropdownsModal}
      />

      {/* Import Assets Modal */}
      <ImportAssetsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={refreshAssets}
      />
    </div>
  )
}
