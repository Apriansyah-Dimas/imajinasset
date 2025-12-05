'use client'

import { useEffect, useState, useCallback, useRef, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Settings, Eye, Package, Upload, Download, Search, ChevronUp, Filter, AlertCircle, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleBasedAccess from '@/components/RoleBasedAccess'
import { useAuth } from '@/contexts/AuthContext'
import AssetImagePlaceholder from '@/components/asset-image-placeholder'
import AssetDetailModalComponent from '@/components/asset-detail-modal'
import AddAssetModalComponent from '@/components/add-asset-modal'
import ImportAssetsModalComponent from '@/components/import-assets-modal'
import EditDropdownsModalComponent from '@/components/edit-dropdowns-modal'

const PAGE_SIZE = 50

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'purchase-newest'
  | 'purchase-oldest'
  | 'asset-number-asc'
  | 'asset-number-desc'

const SORT_CONFIG: Record<
  SortOption,
  { sort: 'name' | 'purchaseDate' | 'noAsset'; order: 'asc' | 'desc' }
> = {
  'name-asc': { sort: 'name', order: 'asc' },
  'name-desc': { sort: 'name', order: 'desc' },
  'purchase-newest': { sort: 'purchaseDate', order: 'desc' },
  'purchase-oldest': { sort: 'purchaseDate', order: 'asc' },
  'asset-number-asc': { sort: 'noAsset', order: 'asc' },
  'asset-number-desc': { sort: 'noAsset', order: 'desc' }
}

type FilterKey = 'status' | 'category' | 'site' | 'department'
type FilterState = Record<FilterKey, string>

const INITIAL_FILTERS: FilterState = {
  status: 'all',
  category: 'all',
  site: 'all',
  department: 'all'
}

const LazyModalFallback = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-xs text-text-muted">
    {label}
  </div>
)

type AssetDetailModalProps = ComponentProps<AssetDetailModalComponent>
type AddAssetModalProps = ComponentProps<AddAssetModalComponent>
type ImportAssetsModalProps = ComponentProps<ImportAssetsModalComponent>
type EditDropdownsModalProps = ComponentProps<EditDropdownsModalComponent>

const AssetDetailModal = dynamic<AssetDetailModalProps>(
  () => import('@/components/asset-detail-modal'),
  {
    loading: () => <LazyModalFallback label="Memuat detail aset..." />,
    ssr: false
  }
)

const AddAssetModal = dynamic<AddAssetModalProps>(
  () => import('@/components/add-asset-modal'),
  {
    loading: () => <LazyModalFallback label="Menyiapkan formulir tambah aset..." />,
    ssr: false
  }
)

const ImportAssetsModal = dynamic<ImportAssetsModalProps>(
  () => import('@/components/import-assets-modal'),
  {
    loading: () => <LazyModalFallback label="Memuat modul impor aset..." />,
    ssr: false
  }
)

const EditDropdownsModal = dynamic<EditDropdownsModalProps>(
  () => import('@/components/edit-dropdowns-modal'),
  {
    loading: () => <LazyModalFallback label="Memuat konfigurasi dropdown..." />,
    ssr: false
  }
)

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

function AssetsPageContent() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [totalResults, setTotalResults] = useState<number | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDropdownsModal, setShowDropdownsModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)

  const loadAssets = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    const controller = new AbortController()

    if (!append) {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
      }
      fetchControllerRef.current = controller
      setLoading(true)
      if (pageNum === 1) {
        setAssets([])
        setHasMore(true)
        setFetchError(null)
        setTotalResults(null)
      }
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: PAGE_SIZE.toString()
      })

      if (searchTerm) params.set('search', searchTerm)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.category !== 'all') params.set('category', filters.category)
      if (filters.site !== 'all') params.set('site', filters.site)
      if (filters.department !== 'all') params.set('department', filters.department)

      const sortConfig = SORT_CONFIG[sortOption]
      params.set('sort', sortConfig.sort)
      params.set('order', sortConfig.order)

      const response = await fetch(`/api/assets?${params.toString()}`, {
        signal: controller.signal
      })

      if (!response.ok) {
        let errorMessage = `Gagal memuat aset (status ${response.status})`
        try {
          const cloned = response.clone()
          const parsed = await cloned.json()
          if (parsed?.error) {
            errorMessage = parsed.error
          }
        } catch {
          try {
            const text = await response.text()
            if (text) {
              errorMessage = text
            }
          } catch {
            // ignore
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const assetsData: Asset[] = data.assets || []
      setAssets(prevAssets => (append ? [...prevAssets, ...assetsData] : assetsData))

      const pagination = data.pagination ?? {}
      setFetchError(null)
      setTotalResults(prevTotal => {
        if (typeof pagination.total === 'number') {
          return pagination.total
        }
        if (append) {
          return (prevTotal ?? 0) + assetsData.length
        }
        return assetsData.length
      })
      const derivedHasMore =
        typeof pagination.hasNext === 'boolean'
          ? pagination.hasNext
          : assetsData.length === PAGE_SIZE

      setHasMore(derivedHasMore)
      setPage(pagination.page ?? pageNum)
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      console.error('Failed to load assets:', error)
      setFetchError(error instanceof Error ? error.message : 'Gagal memuat data aset.')
      if (!append) {
        setAssets([])
        setHasMore(false)
      }
    } finally {
      if (!append) {
        setLoading(false)
        if (fetchControllerRef.current === controller) {
          fetchControllerRef.current = null
        }
      } else {
        setLoadingMore(false)
      }
    }
  }, [searchTerm, filters, sortOption])

  const loadMoreAssets = useCallback(() => {
    if (loading || loadingMore || !hasMore) {
      return
    }
    loadAssets(page + 1, true)
  }, [hasMore, loading, loadingMore, loadAssets, page])

  const refreshAssets = useCallback(() => {
    loadAssets(1, false)
  }, [loadAssets])

  const lastAssetElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (loadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreAssets()
      }
    })
    if (node) observer.current.observe(node)
  }, [loadingMore, hasMore, loadMoreAssets])

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 350)

    return () => clearTimeout(handler)
  }, [searchInput])

  const handleSearchSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
      if (event) event.preventDefault()
      setSearchTerm(searchInput.trim())
    },
    [searchInput]
  )

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()
    const signal = controller.signal

    const fetchFilterOptions = async () => {
      try {
        const [statusRes, categoryRes, siteRes, departmentRes] = await Promise.all([
          fetch('/api/assets/statuses', { signal }),
          fetch('/api/categories', { signal }),
          fetch('/api/sites', { signal }),
          fetch('/api/departments', { signal })
        ])

        if (!isActive) return

        if (statusRes.ok) {
          const statuses: string[] = await statusRes.json()
          setStatusOptions(statuses)
        }

        if (categoryRes.ok) {
          const categories = await categoryRes.json()
          setCategoryOptions(
            categories
              .map((category: { name?: string }) => category.name)
              .filter((name): name is string => Boolean(name))
              .sort((a, b) => a.localeCompare(b))
          )
        }

        if (siteRes.ok) {
          const sites = await siteRes.json()
          setSiteOptions(
            sites
              .map((site: { name?: string }) => site.name)
              .filter((name): name is string => Boolean(name))
              .sort((a, b) => a.localeCompare(b))
          )
        }

        if (departmentRes.ok) {
          const departments = await departmentRes.json()
          setDepartmentOptions(
            departments
              .map((department: { name?: string }) => department.name)
              .filter((name): name is string => Boolean(name))
              .sort((a, b) => a.localeCompare(b))
          )
        }
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return
        console.error('Failed to load filter options:', error)
      }
    }

    fetchFilterOptions()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])


  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.site !== 'all' ||
    filters.department !== 'all'
  const showActiveFilterDot = hasActiveFilters || sortOption !== 'name-asc'
  const showInitialSkeleton = loading && assets.length === 0 && !fetchError

  const handleFilterChange = (type: FilterKey, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS)
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
    value: SortOption
    label: string
    description: string
  }> = [
    { value: 'name-asc', label: 'Nama (A-Z)', description: 'Urut berdasarkan nama aset' },
    { value: 'name-desc', label: 'Nama (Z-A)', description: 'Nama aset dari Z ke A' },
    { value: 'purchase-newest', label: 'Pembelian terbaru', description: 'Urut berdasarkan tanggal beli terbaru' },
    { value: 'purchase-oldest', label: 'Pembelian terlama', description: 'Urut berdasarkan tanggal beli paling lama' },
    { value: 'asset-number-asc', label: 'Nomor aset (A-Z)', description: 'Urut berdasarkan nomor aset' },
    { value: 'asset-number-desc', label: 'Nomor aset (Z-A)', description: 'Urut berdasarkan nomor aset dari terbesar' }
  ]

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
    loadAssets(1, false)
  }, [loadAssets])

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
          <form className="relative flex-1" onSubmit={handleSearchSubmit}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              className="sneat-input h-12 w-full pl-12 pr-28 text-sm"
              type="text"
              placeholder="Cari aset (nama, nomor aset, PIC, status, dsb)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setSearchTerm('')
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-text-muted transition hover:text-primary"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_25px_rgba(99,101,185,0.35)] transition hover:bg-primary/90"
                aria-label="Cari aset"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
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
            <DropdownMenuContent align="end" className="w-80 max-h-[80vh] p-0">
              <div className="space-y-4 p-3 overflow-y-auto max-h-[80vh]">
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
            {loading && assets.length === 0
              ? 'Memuat data...'
              : `Menampilkan ${assets.length}${typeof totalResults === 'number' ? ` dari ${totalResults}` : ''} aset`}
          </span>
        </div>

        {fetchError ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <p>{fetchError}</p>
              </div>
              <button
                type="button"
                onClick={refreshAssets}
                className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-red-600 transition hover:border-red-300"
              >
                Coba lagi
              </button>
            </div>
          </div>
        ) : null}

        {showInitialSkeleton ? (
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 rounded-full bg-surface-border/70" />
                <div className="h-9 w-40 rounded-2xl bg-surface-border/60" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="surface-card animate-pulse space-y-3 p-4">
                    <div className="h-3 w-20 rounded-full bg-surface-border/70" />
                    <div className="h-6 w-24 rounded-full bg-surface-border/60" />
                    <div className="h-10 rounded-2xl bg-surface-border/40" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="h-12 rounded-2xl bg-surface-border/40" />
                ))}
              </div>
            </div>
          </div>
        ) : assets.length > 0 ? (
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
                  {assets.map((asset, index) => (
                    <TableRow
                      key={asset.id}
                      ref={index === assets.length - 1 ? lastAssetElementRef : null}
                      className="border-b border-surface-border/60 transition hover:bg-secondary/20"
                    >
                      <TableCell className="px-3 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg border border-surface-border bg-surface-muted/20 flex items-center justify-center">
                            {asset.imageUrl ? (
                              <div className="relative w-full h-full rounded-lg overflow-hidden">
                                <Image
                                  src={asset.imageUrl}
                                  alt={asset.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const fallback = e.currentTarget.parentElement?.parentElement?.querySelector('[data-placeholder]') as HTMLElement | null
                                    if (fallback) fallback.classList.remove('hidden')
                                    e.currentTarget.parentElement?.classList.add('hidden')
                                  }}
                                  unoptimized
                                />
                              </div>
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
              {assets.map((asset, index) => (
                <div
                  key={asset.id}
                  ref={index === assets.length - 1 ? lastAssetElementRef : null}
                  className="surface-card p-4 shadow-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 relative">
                      {asset.imageUrl ? (
                        <div className="relative w-12 h-12 rounded-2xl border border-surface-border overflow-hidden">
                          <Image
                            src={asset.imageUrl}
                            alt={asset.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const fallback = e.currentTarget.parentElement?.parentElement?.querySelector('[data-placeholder]') as HTMLElement | null
                              if (fallback) fallback.classList.remove('hidden')
                              e.currentTarget.parentElement?.classList.add('hidden')
                            }}
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <div data-placeholder className={asset.imageUrl ? 'hidden' : ''}>
                        <AssetImagePlaceholder size="sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm text-foreground break-words leading-tight">
                          {asset.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.68rem] font-semibold ${getStatusColor(
                            asset.status
                          )} flex-shrink-0`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                          {asset.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">
                        {asset.category?.name && (
                          <span className="rounded-full border border-surface-border px-2 py-0.5">
                            {asset.category.name}
                          </span>
                        )}
                        {asset.site?.name && (
                          <span className="rounded-full border border-surface-border px-2 py-0.5">
                            {asset.site.name}
                          </span>
                        )}
                        {asset.department?.name && (
                          <span className="rounded-full border border-surface-border px-2 py-0.5">
                            {asset.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">No Asset</p>
                      <p className="font-mono text-foreground break-all">{asset.noAsset || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">Status</p>
                      <p className="font-semibold text-foreground">{asset.status}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">Kategori</p>
                      <p className="text-foreground break-all">{asset.category?.name || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">Lokasi</p>
                      <p className="text-foreground break-all">{asset.site?.name || '-'}</p>
                    </div>
                  </div>

                  {(asset.pic || asset.employee) && (
                    <div className="mt-3 rounded-2xl border border-surface-border bg-surface-muted/60 px-3 py-2 text-xs">
                      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-text-muted">PIC</p>
                      {asset.employee ? (
                        <div className="mt-1">
                          <p className="font-semibold text-foreground">{asset.employee.name}</p>
                          {asset.employee.position && (
                            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">
                              {asset.employee.position}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-foreground">{asset.pic}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowDetailModal(true)
                      }}
                      className="w-full sneat-btn sneat-btn-outlined justify-center text-xs font-semibold uppercase tracking-[0.3em]"
                    >
                      <Eye className="h-4 w-4" />
                      Lihat Detail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {hasMore && !loading && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={loadMoreAssets}
              disabled={loadingMore || loading}
              className="sneat-btn sneat-btn-primary inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {loadingMore ? 'Memuat data...' : `Muat ${PAGE_SIZE} item lagi`}
            </button>
          </div>
        )}

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
        {!hasMore && assets.length > 0 && (
          <div className="border-t border-surface-border bg-surface px-4 py-3 text-center text-xs uppercase tracking-[0.35em] text-text-muted">
            END OF LIST -- {typeof totalResults === 'number' ? totalResults : assets.length} ASSETS LOADED
          </div>
        )}

        {/* Empty State */}
        {assets.length === 0 && (
          <div className="surface-card text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {searchTerm !== '' ? 'No assets found' : 'Belum ada asset terdaftar'}
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-text-muted">
              {searchTerm !== ''
                ? `No assets match "${searchTerm}"`
                : 'Start by adding your first asset to the system'
              }
            </p>
            {searchTerm === '' ? (
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
                onClick={() => {
                  setSearchInput('')
                  setSearchTerm('')
                }}
                className="sneat-btn sneat-btn-outlined inline-flex min-w-[160px] items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
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


