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
      case 'Active':
        return 'bg-[#ecfdf3] text-[#1a7f5a] border border-[#9ce8c4]'
      case 'Broken':
        return 'bg-[#fff5f5] text-[#c53030] border border-[#ffc9c9]'
      case 'Maintenance Process':
        return 'bg-[#fff8e6] text-[#b7791f] border border-[#ffe0a6]'
      case 'Lost/Missing':
        return 'bg-[#fff1ed] text-[#c2410c] border border-[#ffc9b0]'
      case 'Sell':
        return 'bg-[#eef4ff] text-[#314299] border border-[#c7d6ff]'
      default:
        return 'bg-surface text-text-muted border border-surface-border'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-surface-border/70" />
            <div className="h-9 w-64 rounded-xl bg-surface-border/60" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="surface-card animate-pulse space-y-4"
              >
                <div className="h-3 w-20 rounded-full bg-surface-border/70" />
                <div className="h-6 w-24 rounded-full bg-surface-border/60" />
              </div>
            ))}
          </div>
          <div className="surface-card animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 rounded-full bg-surface-border/70" />
              <div className="h-9 w-40 rounded-2xl bg-surface-border/60" />
            </div>
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-12 rounded-2xl bg-surface-border/40" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-3">
          <p className="text-[0.65rem] uppercase tracking-[0.6em] text-text-muted">
            Monitor & Control
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Asset Management</h1>
              <p className="text-sm text-text-muted">
                Semua aset perusahaan dalam satu dashboard modern
              </p>
            </div>
          </div>
        </div>

      {/* Action Bar */}
      <RoleBasedAccess
        allowedRoles={['ADMIN', 'SO_ASSET_USER']}
        fallback={
          <div className="surface-card border border-dashed border-surface-border text-center text-sm text-text-muted">
            <Eye className="mx-auto mb-3 h-6 w-6 text-primary" />
            <p>Akses baca saja -- hubungi admin untuk mengelola aset.</p>
          </div>
        }
      >
        <div className="surface-card space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <RoleBasedAccess allowedRoles={['ADMIN']}>
              <div className="flex flex-1 flex-wrap gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="sneat-btn sneat-btn-primary min-w-[140px] justify-center"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Asset</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="sneat-btn justify-center border border-[#c8e0ff] bg-[#eef5ff] text-[#2d5fd2]"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="sneat-btn justify-center border border-[#ffd4d4] bg-[#fff4f4] text-[#d23a3a]"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete All</span>
                </button>
                <button
                  onClick={() => setShowDropdownsModal(true)}
                  className="sneat-btn sneat-btn-outlined justify-center"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </div>
            </RoleBasedAccess>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="sneat-btn sneat-btn-soft w-full justify-center border border-[#c8caff] bg-[#f2f2ff] text-primary transition disabled:opacity-60 md:w-auto"
            >
              {isExporting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-text-muted">
            Quick actions
          </p>
        </div>
      </RoleBasedAccess>

      {/* Search Bar */}
      <div className="surface-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Cari aset (nama, nomor aset, PIC, status, dsb)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sneat-input w-full pl-12 text-sm"
          />
        </div>
      </div>

      {/* Assets List */}
      <div className="surface-card min-w-0 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-4">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.45em] text-text-muted">Daftar aset</p>
            <h2 className="text-lg font-semibold text-foreground">Inventaris Lengkap</h2>
          </div>
          <span className="sneat-chip bg-primary/10 text-primary">
            {filteredAssets.length} item
          </span>
        </div>

        {filteredAssets.length > 0 ? (
          <>
            {/* Desktop/Table View - Hidden on small screens */}
            <div className="hidden sm:block">
              <Table className="sneat-table w-full text-xs">
                <TableHeader>
                  <TableRow className="bg-secondary/60 text-[0.65rem] uppercase tracking-[0.25em] text-text-muted">
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Asset Name</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">No Asset</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Category</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Site</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Status</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted text-center">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset, index) => (
                    <TableRow
                      key={asset.id}
                      ref={index === filteredAssets.length - 1 ? lastAssetElementRef : null}
                      className="border-b border-surface-border/60 transition hover:bg-secondary/20"
                    >
                      <TableCell className="px-3 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg border border-surface-border bg-surface-muted/20 flex items-center justify-center">
                            {asset.imageUrl ? (
                              <img
                                src={asset.imageUrl}
                                alt={asset.name}
                                className="w-full h-full rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const fallback = e.currentTarget.parentElement?.querySelector('[data-placeholder]') as HTMLElement | null
                                  if (fallback) fallback.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <div data-placeholder className={asset.imageUrl ? 'hidden' : 'w-full h-full'}>
                              <AssetImagePlaceholder size="sm" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 mt-3">
                            <p className="text-xs font-semibold text-foreground leading-tight whitespace-normal break-words">
                              {asset.name}
                            </p>
                            <p className="mt-1 text-[0.7rem] text-text-muted lg:block whitespace-normal break-words">
                              PIC: {asset.employee ? `${asset.employee.name} (${asset.employee.employeeId})` : (asset.pic || 'N/A')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="font-mono text-xs text-primary break-all">
                          {asset.noAsset}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold ${getStatusColor(asset.status)}`}>
                          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                          {asset.category?.name}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span className="text-xs text-foreground break-all">
                          {asset.site?.name}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold ${getStatusColor(asset.status)}`}>
                          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                          {asset.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset)
                            setShowDetailModal(true)
                          }}
                          className="sneat-btn sneat-btn-outlined w-full justify-center text-[0.7rem] font-semibold uppercase tracking-[0.1em] py-1"
                        >
                          <Eye className="h-2.5 w-2.5" />
                          <span>View</span>
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
                  className="surface-card p-3 shadow-none transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0">
                      {asset.imageUrl ? (
                        <img
                          src={asset.imageUrl}
                          alt={asset.name}
                          className="w-12 h-12 rounded-2xl border border-surface-border object-cover"
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
                        <h3 className="font-semibold text-sm text-foreground break-words leading-tight">
                          {asset.name}
                        </h3>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-semibold ${getStatusColor(asset.status)} flex-shrink-0`}>
                          <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                          {asset.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted font-medium uppercase tracking-[0.3em]">No Asset</span>
                      <span className="font-mono text-primary break-all ml-2">{asset.noAsset}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-text-muted font-medium uppercase tracking-[0.3em]">Category</span>
                      <span className="text-foreground break-all ml-2">{asset.category?.name}</span>
                    </div>

                    {(asset.pic || asset.employee) && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted font-medium uppercase tracking-[0.3em]">PIC</span>
                        <span className="text-foreground break-all ml-2 text-right">
                          {asset.employee ? (
                            <div className="space-y-0.5 text-right">
                              <div className="font-semibold">{asset.employee.name} ({asset.employee.employeeId})</div>
                              {asset.employee.position && (
                                <div className="text-[0.65rem] uppercase tracking-[0.3em] text-text-muted">{asset.employee.position}</div>
                              )}
                            </div>
                          ) : (
                            asset.pic
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-surface-border">
                    <button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowDetailModal(true)
                      }}
                      className="w-full sneat-btn sneat-btn-outlined justify-center text-xs font-semibold uppercase tracking-[0.3em]"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
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
            <div className="hidden sm:block p-3">
              <Table>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i} className="border-b border-surface-border/60">
                      <TableCell className="py-3 px-3 align-top">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-surface-border/40 flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <div className="h-3 bg-surface-border/40 rounded w-3/4 mb-2"></div>
                            <div className="h-2.5 bg-surface-border/40 rounded w-2/3"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="h-3 bg-surface-border/40 rounded w-14"></div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="h-4 bg-surface-border/40 rounded w-10"></div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="h-3 bg-surface-border/40 rounded w-10"></div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="h-4 bg-surface-border/40 rounded w-10"></div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <div className="h-5 bg-surface-border/40 rounded w-10 mx-auto"></div>
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
          <div className="border-t border-surface-border bg-surface px-4 py-3 text-center text-xs uppercase tracking-[0.35em] text-text-muted">
            END OF LIST -- {filteredAssets.length} ASSETS LOADED
          </div>
        )}

        {/* Empty State */}
        {filteredAssets.length === 0 && (
          <div className="surface-card text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {searchQuery.trim() !== '' ? 'No assets found' : 'Belum ada asset terdaftar'}
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-text-muted">
              {searchQuery.trim() !== ''
                ? `No assets match "${searchQuery}"`
                : 'Start by adding your first asset to the system'
              }
            </p>
            {searchQuery.trim() === '' ? (
              <RoleBasedAccess allowedRoles={['ADMIN']}>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="sneat-btn sneat-btn-primary inline-flex min-w-[180px] justify-center"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah asset pertama</span>
                </button>
              </RoleBasedAccess>
            ) : (
              <button
                onClick={() => setSearchQuery('')}
                className="sneat-btn sneat-btn-outlined inline-flex min-w-[160px] justify-center"
              >
                Clear search
              </button>
            )}
          </div>
        )}
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

