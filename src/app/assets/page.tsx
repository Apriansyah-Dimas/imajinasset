'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Settings, Eye, Package, Upload, Download, Search, ChevronUp, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import ImportAssetsModal from '@/components/import-assets-modal'
import AssetDetailModal from '@/components/asset-detail-modal'
import AddAssetModal from '@/components/add-asset-modal'
import EditDropdownsModal from '@/components/edit-dropdowns-modal'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    site: 'all',
    department: 'all'
  })
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'created-newest' | 'created-oldest'>('name-asc')

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

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(assets.map(asset => asset.status).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [assets]
  )

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          assets
            .map(asset => asset.category?.name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [assets]
  )

  const siteOptions = useMemo(
    () =>
      Array.from(
        new Set(
          assets
            .map(asset => asset.site?.name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [assets]
  )

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          assets
            .map(asset => asset.department?.name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [assets]
  )

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.site !== 'all' ||
    filters.department !== 'all'
  const showActiveFilterDot = hasActiveFilters || sortOption !== 'name-asc'

  const handleFilterChange = (type: 'status' | 'category' | 'site' | 'department', value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const resetFilters = () => {
    setFilters({
      status: 'all',
      category: 'all',
      site: 'all',
      department: 'all'
    })
  }

  const resetFiltersAndSort = () => {
    resetFilters()
    setSortOption('name-asc')
  }

  const filterChipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition ${
      active
        ? 'border-primary bg-primary/10 text-primary shadow-[0_6px_18px_rgba(62,82,160,0.18)]'
        : 'border-surface-border text-text-muted hover:border-primary/40 hover:text-primary'
    }`

  const sortTileClass = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
      active
        ? 'border-primary bg-primary/10 text-primary shadow-[0_6px_18px_rgba(62,82,160,0.18)]'
        : 'border-surface-border text-text-muted hover:border-primary/40 hover:text-primary'
    }`

  const sortOptionsList: Array<{
    value: typeof sortOption
    label: string
    description: string
  }> = [
    { value: 'name-asc', label: 'Nama (A-Z)', description: 'Urut berdasarkan nama aset' },
    { value: 'name-desc', label: 'Nama (Z-A)', description: 'Nama aset dari Z ke A' },
    { value: 'created-newest', label: 'Terbaru', description: 'Aset dengan tanggal dibuat terbaru' },
    { value: 'created-oldest', label: 'Terlama', description: 'Aset paling lama dibuat' }
  ]

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

  const handleDetailModalOpenChange = (isOpen: boolean) => {
    setShowDetailModal(isOpen)
    if (!isOpen) {
      setSelectedAsset(null)
    }
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

    let workingAssets: Asset[] =
      normalizedQuery === ''
        ? assets
        : assetSearchIndex
            .filter(entry => entry.tokens.some(token => token.includes(normalizedQuery)))
            .map(entry => entry.asset)

    if (filters.status !== 'all') {
      workingAssets = workingAssets.filter(asset => asset.status === filters.status)
    }

    if (filters.category !== 'all') {
      workingAssets = workingAssets.filter(asset => asset.category?.name === filters.category)
    }

    if (filters.site !== 'all') {
      workingAssets = workingAssets.filter(asset => asset.site?.name === filters.site)
    }

    if (filters.department !== 'all') {
      workingAssets = workingAssets.filter(asset => asset.department?.name === filters.department)
    }

    const sortedAssets = [...workingAssets].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'created-newest':
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
        case 'created-oldest':
          return new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
        default:
          return 0
      }
    })

    setFilteredAssets(sortedAssets)
  }, [searchQuery, assets, assetSearchIndex, filters, sortOption])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

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
            Asset Registry
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Asset Management</h1>
              <p className="text-sm text-text-muted">
                Manage and track all company assets in one centralized system
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
                  className="sneat-btn sneat-btn-primary min-w-[140px] justify-center text-white"
                >
                  <Plus className="h-4 w-4 text-white" />
                  <span className="text-white">Add Asset</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="sneat-btn justify-center border border-[#c8e0ff] bg-[#eef5ff] text-[#2d5fd2]"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              className="sneat-input h-12 w-full pl-12 text-sm"
              type="text"
              placeholder="Cari aset (nama, nomor aset, PIC, status, dsb)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Filter dan urutkan aset"
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-background text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter & Sort</span>
                {showActiveFilterDot ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="space-y-4 p-3">
                <div className="flex items-center justify-between">
                  <DropdownMenuLabel className="p-0 text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">
                    Filter & Sort
                  </DropdownMenuLabel>
                  {showActiveFilterDot ? (
                    <button
                      type="button"
                      onClick={resetFiltersAndSort}
                      className="text-[0.7rem] font-semibold text-primary hover:text-primary/80"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>

                <div>
                  <p className="text-[0.65rem] uppercase text-text-muted">
                    Filter status
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['all', ...statusOptions].map(status => (
                      <button
                        key={status || 'all-status'}
                        type="button"
                        onClick={() => handleFilterChange('status', status || 'all')}
                        className={filterChipClass(filters.status === (status || 'all'))}
                      >
                        {status === 'all' ? 'Semua status' : status}
                      </button>
                    ))}
                  </div>
                </div>

                {categoryOptions.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] uppercase text-text-muted">
                      Filter kategori
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['all', ...categoryOptions].map(category => (
                        <button
                          key={category || 'all-category'}
                          type="button"
                          onClick={() => handleFilterChange('category', category || 'all')}
                          className={filterChipClass(filters.category === (category || 'all'))}
                        >
                          {category === 'all' ? 'Semua kategori' : category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {siteOptions.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] uppercase text-text-muted">
                      Filter lokasi
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['all', ...siteOptions].map(site => (
                        <button
                          key={site || 'all-site'}
                          type="button"
                          onClick={() => handleFilterChange('site', site || 'all')}
                          className={filterChipClass(filters.site === (site || 'all'))}
                        >
                          {site === 'all' ? 'Semua lokasi' : site}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {departmentOptions.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] uppercase text-text-muted">
                      Filter department
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['all', ...departmentOptions].map(dept => (
                        <button
                          key={dept || 'all-dept'}
                          type="button"
                          onClick={() => handleFilterChange('department', dept || 'all')}
                          className={filterChipClass(filters.department === (dept || 'all'))}
                        >
                          {dept === 'all' ? 'Semua department' : dept}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[0.65rem] uppercase text-text-muted">
                    Urutkan
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {sortOptionsList.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortOption(option.value)}
                        className={sortTileClass(sortOption === option.value)}
                      >
                        <span className="text-[0.75rem]">{option.label}</span>
                        <p className="mt-1 text-[0.65rem] font-normal text-text-muted">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className="mt-0" />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Assets List */}
      <div className="surface-card min-w-0 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">ASSET LIST</h2>
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
                  <TableRow className="bg-secondary/60 text-[0.65rem] uppercase text-text-muted">
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Asset Name</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">No Asset</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Category</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Site</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted">Status</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-text-muted text-center w-[110px]">Detail</TableHead>
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
                              PIC: {asset.employee ? asset.employee.name : (asset.pic || 'N/A')}
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
                        <span className="text-xs text-foreground break-all">
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
                      <TableCell className="px-3 py-3 text-center w-[110px]">
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
                              <div className="font-semibold">{asset.employee.name}</div>
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
                  className="sneat-btn sneat-btn-primary inline-flex min-w-[180px] justify-center text-white"
                >
                  <Plus className="h-4 w-4 text-white" />
                  <span className="text-white">Tambah asset pertama</span>
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

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Kembali ke atas"
        aria-hidden={!showScrollTop}
        className={`group fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-[0_12px_30px_rgba(99,101,185,0.35)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto hover:-translate-y-1 hover:bg-primary/90'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ChevronUp
          className={`h-5 w-5 transition-transform duration-200 ${
            showScrollTop ? 'animate-bounce group-hover:-translate-y-1' : ''
          }`}
        />
      </button>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        asset={selectedAsset}
        open={showDetailModal}
        onOpenChange={handleDetailModalOpenChange}
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
