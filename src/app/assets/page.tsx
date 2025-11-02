'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Settings, Eye, Package, Upload, Download, Search, Trash2 } from 'lucide-react'
import ImportAssetsModal from '@/components/import-assets-modal'
import AssetDetailModal from '@/components/asset-detail-modal'
import AddAssetModal from '@/components/add-asset-modal'
import EditDropdownsModal from '@/components/edit-dropdowns-modal'
import { DeleteAllAssetsModal } from '@/components/delete-all-assets-modal'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleBasedAccess from '@/components/RoleBasedAccess'
import { useAuth } from '@/contexts/AuthContext'
import AssetImagePlaceholder from '@/components/asset-image-placeholder'

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
  picId?: string
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
  }
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
      // notes might be plain text; already handled in baseValues
    }
  }

  return toSearchTokens([...baseValues, ...employeeValues, ...additionalNoteTokens])
}

function AssetsPageContent() {
  const { user } = useAuth()
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
  const [isExporting, setIsExporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const observer = useRef<IntersectionObserver>()
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
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      const response = await fetch(`/api/assets?limit=10000`)

      if (response.ok) {
        const data = await response.json()
        const assetsData: Asset[] = data.assets || []

        let updatedAssets: Asset[] = []
        setAssets(prevAssets => {
          updatedAssets = append ? [...prevAssets, ...assetsData] : assetsData
          return updatedAssets
        })

        if (searchQuery.trim() === '') {
          setFilteredAssets(updatedAssets)
        }
      } else if (!append) {
        setAssets([])
        setFilteredAssets([])
      }
    } catch (error) {
      if (!append) {
        setAssets([])
        setFilteredAssets([])
      }
    }

    setHasMore(false)
    setPage(pageNum)
    setLoading(false)
    setLoadingMore(false)
  }

  const loadMoreAssets = () => {
    if (!loadingMore && hasMore) {
      loadAssets(page + 1, true)
    }
  }

  const refreshAssets = () => {
    loadAssets(1, false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/assets/export')

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url

      const contentDisposition = response.headers.get('content-disposition')
      let filename = `assets-export-${new Date().toISOString().split('T')[0]}.csv`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export assets. Please try again.')
    } finally {
      setIsExporting(false)
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
      case 'Active': return 'bg-green-100 text-green-800 border-2 border-green-600'
      case 'Broken': return 'bg-red-100 text-red-800 border-2 border-red-600'
      case 'Maintenance Process': return 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
      case 'Lost/Missing': return 'bg-orange-100 text-orange-800 border-2 border-orange-600'
      case 'Sell': return 'bg-blue-100 text-blue-800 border-2 border-blue-600'
      default: return 'bg-gray-100 text-gray-800 border-2 border-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200"></div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-900 text-white px-4 py-3 border-b border-gray-950">
            <h2 className="text-sm font-bold">LOADING ASSETS...</h2>
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 break-words">ASSET MANAGEMENT</h1>
        <p className="text-xs sm:text-sm text-gray-600 break-words">Manage and track all company assets</p>
      </div>

      {/* Action Bar */}
      <RoleBasedAccess
        allowedRoles={['ADMIN', 'SO_ASSET_USER']}
        fallback={
          <div className="bg-white border-2 border-gray-300 p-3 sm:p-3 mb-3 sm:mb-4 min-w-0">
            <div className="text-center text-xs sm:text-sm text-gray-500">
              <Eye className="h-5 w-5 mx-auto mb-2 text-gray-400" />
              <div className="px-2">Read-only access - Contact admin for asset modifications</div>
            </div>
          </div>
        }
      >
        <div className="bg-white border-2 border-gray-300 p-3 sm:p-3 mb-3 sm:mb-4 min-w-0">
          {/* Mobile Layout - Vertical stacking */}
          <div className="sm:hidden space-y-2">
            <RoleBasedAccess allowedRoles={['ADMIN']}>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center px-2 py-2.5 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-xs rounded min-w-0"
                >
                  <Plus className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">ADD</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center px-2 py-2.5 bg-green-600 text-white border border-green-700 hover:bg-green-700 font-medium text-xs rounded min-w-0"
                >
                  <Upload className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">IMPORT</span>
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="flex items-center justify-center px-2 py-2.5 bg-red-600 text-white border border-red-700 hover:bg-red-700 font-medium text-xs rounded min-w-0"
                >
                  <Trash2 className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">DELETE ALL</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDropdownsModal(true)}
                  className="flex items-center justify-center px-3 py-2.5 bg-gray-600 text-white border border-gray-700 hover:bg-gray-700 font-medium text-xs rounded min-w-0"
                >
                  <Settings className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">SETTINGS</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center justify-center px-3 py-2.5 bg-purple-600 text-white border border-purple-700 hover:bg-purple-700 font-medium text-xs rounded disabled:opacity-50 min-w-0"
                >
                  {isExporting ? (
                    <>
                      <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent flex-shrink-0" />
                      <span className="truncate">EXP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">EXPORT</span>
                    </>
                  )}
                </button>
              </div>
            </RoleBasedAccess>
          </div>

          {/* Desktop/Table Layout - Horizontal */}
          <div className="hidden sm:flex flex-wrap gap-2">
            <RoleBasedAccess allowedRoles={['ADMIN']}>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                <span>ADD</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center px-3 py-2 bg-green-600 text-white border border-green-700 hover:bg-green-700 font-medium text-xs sm:text-sm"
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                <span>IMPORT</span>
              </button>
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center justify-center px-3 py-2 bg-red-600 text-white border border-red-700 hover:bg-red-700 font-medium text-xs sm:text-sm"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                <span>DELETE ALL</span>
              </button>
              <button
                onClick={() => setShowDropdownsModal(true)}
                className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white border border-gray-700 hover:bg-gray-700 font-medium text-xs sm:text-sm"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                <span>SETTINGS</span>
              </button>
            </RoleBasedAccess>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white border border-purple-700 hover:bg-purple-700 font-medium text-xs sm:text-sm disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent flex-shrink-0" />
                  <span>EXP...</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span>EXPORT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </RoleBasedAccess>

      {/* Search Bar */}
      <div className="bg-white border-2 border-gray-300 p-3 sm:p-4 mb-3 sm:mb-4 min-w-0">
        <div className="space-y-3">
          {/* Basic Search */}
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search assets (name, no asset, status, PIC, etc.)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm min-w-0"
            />
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-white border-2 border-gray-300 min-w-0">
        <div className="bg-gray-900 text-white px-3 sm:px-4 py-2 sm:py-3 border-b-2 border-gray-950">
          <h2 className="text-xs sm:text-sm font-bold break-words text-white">
            ASSET LIST {filteredAssets.length > 0 && `(${filteredAssets.length})`}
          </h2>
        </div>

        {filteredAssets.length > 0 ? (
          <>
            {/* Desktop/Table View - Hidden on small screens */}
            <div className="hidden sm:block overflow-x-auto scrollbar-hide">
              <Table className="w-full min-w-[500px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b-2 border-gray-900">
                    <TableHead className="font-bold text-black py-2 px-3 sm:px-4 w-[45%] min-w-[200px] text-xs sm:text-sm">NAMA ASSET</TableHead>
                    <TableHead className="font-bold text-black py-2 px-3 sm:px-4 w-[25%] min-w-[100px] text-xs sm:text-sm">NO ASSET</TableHead>
                    <TableHead className="font-bold text-black py-2 px-3 sm:px-4 w-[15%] min-w-[80px] text-xs sm:text-sm hidden md:table-cell">STATUS</TableHead>
                    <TableHead className="font-bold text-black py-2 px-3 sm:px-4 w-[15%] min-w-[80px] text-xs sm:text-sm text-center">VIEW</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset, index) => (
                    <TableRow
                      key={asset.id}
                      ref={index === filteredAssets.length - 1 ? lastAssetElementRef : null}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <TableCell className="py-2 px-3 sm:px-4 w-[45%] min-w-[200px]">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {asset.imageUrl ? (
                              <img
                                src={asset.imageUrl}
                                alt={asset.name}
                                className="w-12 h-12 rounded-lg border border-gray-200 object-cover"
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
                          <div className="min-w-0 max-w-full">
                            <div className="font-bold text-xs text-gray-900 break-all whitespace-normal leading-tight" style={{wordWrap: 'break-word', hyphens: 'auto'}}>
                              {asset.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 break-words truncate">
                              {asset.category?.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 break-words hidden lg:block">
                              PIC: {asset.employee ? `${asset.employee.name} (${asset.employee.employeeId})` : (asset.pic || 'N/A')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3 sm:px-4 w-[25%] min-w-[100px]">
                        <div className="font-mono text-xs text-foreground break-all">
                          {asset.noAsset}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3 sm:px-4 w-[15%] min-w-[80px] hidden md:table-cell">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold border ${getStatusColor(asset.status)} whitespace-nowrap`}>
                          {asset.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-3 sm:px-4 w-[15%] min-w-[80px] text-center">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset)
                            setShowDetailModal(true)
                          }}
                          className="flex items-center justify-center px-2 py-1 border-2 border-gray-300 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium whitespace-nowrap w-full"
                        >
                          <Eye className="h-3 w-3 mr-0.5" />
                          <span>VIEW</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View - Shown only on small screens */}
            <div className="sm:hidden space-y-3">
              {filteredAssets.map((asset, index) => (
                <div
                  key={asset.id}
                  ref={index === filteredAssets.length - 1 ? lastAssetElementRef : null}
                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0">
                      {asset.imageUrl ? (
                        <img
                          src={asset.imageUrl}
                          alt={asset.name}
                          className="w-12 h-12 rounded-lg border border-gray-200 object-cover"
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
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm text-gray-900 break-words leading-tight">
                          {asset.name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold border ${getStatusColor(asset.status)} whitespace-nowrap flex-shrink-0`}>
                          {asset.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">No. Asset:</span>
                      <span className="font-mono text-foreground break-all ml-2">{asset.noAsset}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Category:</span>
                      <span className="text-foreground break-all ml-2">{asset.category?.name}</span>
                    </div>

                    {(asset.pic || asset.employee) && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">PIC:</span>
                        <span className="text-foreground break-all ml-2">
                          {asset.employee ? (
                            <div>
                              <div>{asset.employee.name} ({asset.employee.employeeId})</div>
                              {asset.employee.position && (
                                <div className="text-xs text-gray-500">{asset.employee.position}</div>
                              )}
                            </div>
                          ) : (
                            asset.pic
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowDetailModal(true)
                      }}
                      className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-xs rounded"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      VIEW DETAILS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* Loading More */}
        {loadingMore && (
          <>
            {/* Desktop/Table Loading Skeleton */}
            <div className="hidden sm:block p-3 sm:p-4">
              <Table>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i} className="border-b border-gray-200">
                      <TableCell className="py-2 px-3 sm:px-4 w-[45%] min-w-[200px]">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                      </TableCell>
                      <TableCell className="py-2 px-3 sm:px-4 w-[25%] min-w-[100px]">
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </TableCell>
                      <TableCell className="py-2 px-3 sm:px-4 w-[15%] min-w-[80px] hidden md:table-cell">
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                      </TableCell>
                      <TableCell className="py-2 px-3 sm:px-4 w-[15%] min-w-[80px] text-center">
                        <div className="h-6 bg-gray-200 rounded w-12 mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Loading Skeleton */}
            <div className="sm:hidden space-y-3 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-12 flex-shrink-0"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-20 ml-2"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 ml-2"></div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* No More Assets */}
        {!hasMore && filteredAssets.length > 0 && (
          <div className="p-3 sm:p-4 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
            END OF LIST • {filteredAssets.length} ASSETS LOADED
          </div>
        )}

        {/* Empty State */}
        {filteredAssets.length === 0 && (
          <div className="p-6 sm:p-12 text-center">
            <Package className="h-12 w-12 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-400 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 break-words px-4">
              {searchQuery.trim() !== '' ? 'NO ASSETS FOUND' : 'NO ASSETS REGISTERED'}
            </h3>
            <p className="text-sm sm:text-sm text-gray-600 mb-6 break-words max-w-sm sm:max-w-md mx-auto px-4">
              {searchQuery.trim() !== ''
                ? `No assets match "${searchQuery}"`
                : 'Start by adding your first asset to the system'
              }
            </p>
            {searchQuery.trim() === '' ? (
              <RoleBasedAccess allowedRoles={['ADMIN']}>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-sm rounded min-w-[140px]"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>ADD FIRST ASSET</span>
                </button>
              </RoleBasedAccess>
            ) : (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white border border-gray-700 hover:bg-gray-700 font-medium text-sm rounded min-w-[120px]"
              >
                CLEAR SEARCH
              </button>
            )}
          </div>
        )}
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

      {/* Bulk Add Modal removed in favor of Import page */}

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

      {/* Delete All Assets Modal */}
      <DeleteAllAssetsModal
        open={showDeleteAllModal}
        onOpenChange={setShowDeleteAllModal}
        onSuccess={refreshAssets}
      />
    </div>
  )
}

export default function AssetsPage() {
  return (
    <ProtectedRoute>
      <AssetsPageContent />
    </ProtectedRoute>
  )
}
