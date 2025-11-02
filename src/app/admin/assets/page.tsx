'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Eye, Download, Upload, AlertCircle, CheckCircle, Clock, DollarSign, MapPin, User, Tag } from 'lucide-react'
import { toast } from 'sonner'

interface Asset {
  id: string
  noAsset: string
  name: string
  serialNo: string
  cost: number | null
  status: string
  pic?: string | null
  imageUrl?: string | null
  notes: string | null
  brand: string | null
  model: string | null
  categoryId: string | null
  siteId: string | null
  departmentId: string | null
  createdAt: string
  updatedAt: string
  category?: { name: string }
  site?: { name: string }
  department?: { name: string }
}

interface Category {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface AssetImportIssue {
  row: number
  reason: string
  fields?: string[]
}

interface AssetImportResult {
  imported: number
  skipped: number
  total: number
  issues: AssetImportIssue[]
}

export default function AssetManagementPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [siteFilter, setSiteFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<AssetImportResult | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    noAsset: '',
    name: '',
    serialNo: '',
    cost: '',
    status: 'Active',
    pic: '',
    notes: '',
    brand: '',
    model: '',
    categoryId: '',
    siteId: '',
    departmentId: ''
  })

  useEffect(() => {
    fetchAssets()
    fetchCategories()
    fetchSites()
    fetchDepartments()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
      }
    } catch (error) {
      toast.error('Failed to fetch assets')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategories([])
    }
  }

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites')
      if (response.ok) {
        const data = await response.json()
        setSites(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error)
      setSites([])
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
      setDepartments([])
    }
  }

  const filteredAssets = (assets || []).filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.noAsset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.pic.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || asset.categoryId === categoryFilter
    const matchesSite = siteFilter === 'all' || asset.siteId === siteFilter

    return matchesSearch && matchesStatus && matchesCategory && matchesSite
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Inactive': return 'bg-gray-100 text-gray-800'
      case 'Disposed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircle className="h-4 w-4" />
      case 'Inactive': return <AlertCircle className="h-4 w-4" />
      case 'Disposed': return <Trash2 className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const resetForm = () => {
    setFormData({
      noAsset: '',
      name: '',
      serialNo: '',
      cost: '',
      status: 'Active',
      pic: '',
      notes: '',
      brand: '',
      model: '',
      categoryId: '',
      siteId: '',
      departmentId: ''
    })
  }

  const handleAddAsset = async () => {
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          categoryId: formData.categoryId || null,
          siteId: formData.siteId || null,
          departmentId: formData.departmentId || null
        })
      })

      if (response.ok) {
        toast.success('Asset added successfully')
        setShowAddModal(false)
        resetForm()
        fetchAssets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add asset')
      }
    } catch (error) {
      toast.error('Failed to add asset')
    }
  }

  const handleEditAsset = async () => {
    if (!selectedAsset) return

    try {
      const response = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          categoryId: formData.categoryId || null,
          siteId: formData.siteId || null,
          departmentId: formData.departmentId || null
        })
      })

      if (response.ok) {
        toast.success('Asset updated successfully')
        setShowEditModal(false)
        setSelectedAsset(null)
        resetForm()
        fetchAssets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update asset')
      }
    } catch (error) {
      toast.error('Failed to update asset')
    }
  }

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return

    try {
      const response = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Asset deleted successfully')
        setShowDeleteModal(false)
        setSelectedAsset(null)
        fetchAssets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete asset')
      }
    } catch (error) {
      toast.error('Failed to delete asset')
    }
  }

  const handleExportAssets = async () => {
    try {
      const response = await fetch('/api/admin/assets/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `assets-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Assets exported successfully')
      }
    } catch (error) {
      toast.error('Failed to export assets')
    }
  }

  const handleImportAssets = async () => {
    if (!importFile) {
      toast.error('Please select a file to import')
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/admin/assets/import', {
        method: 'POST',
        body: formData
      })

      const payload = await response.json()

      if (response.ok) {
        let issues: AssetImportIssue[] = Array.isArray(payload.issues)
          ? payload.issues.map((issue: any) => ({
              row: issue.row ?? issue.rowNumber ?? issue.line ?? 0,
              reason: issue.reason || issue.message || String(issue.reason ?? issue.message ?? issue),
              fields: issue.fields
            }))
          : []

        if (!issues.length && Array.isArray(payload.errorMessages)) {
          issues = payload.errorMessages.map((msg: string) => {
            const match = msg.match(/Row\s+(\d+)/i)
            return {
              row: match ? parseInt(match[1], 10) : 0,
              reason: msg.replace(/^Row\s+\d+:\s*/i, '')
            }
          })
        }

        const skippedCount =
          (typeof payload.skipped === 'number' ? payload.skipped : undefined) ??
          (typeof payload.errors === 'number' ? payload.errors : undefined) ??
          issues.length

        const totalRows =
          typeof payload.total === 'number'
            ? payload.total
            : typeof payload.totalRows === 'number'
              ? payload.totalRows
              : (payload.imported || 0) + skippedCount

        const summary: AssetImportResult = {
          imported: payload.imported || 0,
          skipped: skippedCount,
          total: totalRows,
          issues
        }

        setImportResult(summary)

        if (summary.imported > 0) {
          fetchAssets()
        }

        if (summary.skipped > 0 && summary.issues.length) {
          toast.warning(`Imported ${summary.imported} assets. Skipped ${summary.skipped}.`, {
            description: summary.issues
              .slice(0, 5)
              .map(issue =>
                issue.row ? `Row ${issue.row}: ${issue.reason}` : `${issue.reason}`
              )
              .join('\n')
          })
        } else if (summary.skipped > 0) {
          toast.warning(`Imported ${summary.imported} assets. Skipped ${summary.skipped}.`)
        } else {
          toast.success(`Imported ${summary.imported} assets successfully.`)
          setShowImportModal(false)
          setImportFile(null)
          setImportResult(null)
        }
      } else {
        const issues: AssetImportIssue[] = Array.isArray(payload.issues)
          ? payload.issues.map((issue: any) => ({
              row: issue.row ?? issue.rowNumber ?? issue.line ?? 0,
              reason: issue.reason || issue.message || String(issue.reason ?? issue.message ?? issue),
              fields: issue.fields
            }))
          : Array.isArray(payload.errorMessages)
            ? payload.errorMessages.map((msg: string) => {
                const match = msg.match(/Row\s+(\d+)/i)
                return {
                  row: match ? parseInt(match[1], 10) : 0,
                  reason: msg.replace(/^Row\s+\d+:\s*/i, '')
                }
              })
            : []

        if (issues.length) {
          const skippedCount =
            (typeof payload.skipped === 'number' ? payload.skipped : undefined) ??
            issues.length

          const totalRows =
            typeof payload.total === 'number'
              ? payload.total
              : typeof payload.totalRows === 'number'
                ? payload.totalRows
                : (payload.imported || 0) + skippedCount

          setImportResult({
            imported: payload.imported || 0,
            skipped: skippedCount,
            total: totalRows,
            issues
          })
        }

        toast.error(payload.error || 'Failed to import assets')
      }
    } catch (error) {
      console.error('Asset import error:', error)
      toast.error('Failed to import assets')
    } finally {
      setImporting(false)
    }
  }

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset)
    setFormData({
      noAsset: asset.noAsset,
      name: asset.name,
      serialNo: asset.serialNo,
      cost: asset.cost?.toString() || '',
      status: asset.status,
      pic: asset.pic,
      notes: asset.notes || '',
      brand: asset.brand || '',
      model: asset.model || '',
      categoryId: asset.categoryId || '',
      siteId: asset.siteId || '',
      departmentId: asset.departmentId || ''
    })
    setShowEditModal(true)
  }

  const totalValue = (assets || []).reduce((sum, asset) => sum + (asset.cost || 0), 0)
  const activeAssets = (assets || []).filter(asset => asset.status === 'Active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assets</p>
              <p className="text-2xl font-semibold text-gray-900">{(assets || []).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Assets</p>
              <p className="text-2xl font-semibold text-gray-900">{activeAssets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Disposed">Disposed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
              <button
                onClick={() => {
                  setImportResult(null)
                  setImportFile(null)
                  setShowImportModal(true)
                }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </button>
            <button
              onClick={handleExportAssets}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Asset
            </button>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category / Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No assets found
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                        <div className="text-sm text-gray-500">{asset.noAsset}</div>
                        <div className="text-xs text-gray-400">{asset.serialNo}</div>
                        {asset.brand && asset.model && (
                          <div className="text-xs text-gray-400">{asset.brand} {asset.model}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        {getStatusIcon(asset.status)}
                        <span className="ml-1">{asset.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{asset.pic}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div>{asset.category?.name || '-'}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {asset.site?.name || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {asset.cost ? `$${asset.cost.toLocaleString()}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAsset(asset)
                          setShowDetailsModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(asset)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAsset(asset)
                          setShowDeleteModal(true)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Asset</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Number *</label>
                <input
                  type="text"
                  required
                  value={formData.noAsset}
                  onChange={(e) => setFormData({ ...formData, noAsset: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                <input
                  type="text"
                  value={formData.serialNo}
                  onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIC *</label>
                <input
                  type="text"
                  required
                  value={formData.pic}
                  onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Site</label>
                <select
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="">Select Site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Asset</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Same form fields as Add Modal */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Number *</label>
                <input
                  type="text"
                  required
                  value={formData.noAsset}
                  onChange={(e) => setFormData({ ...formData, noAsset: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                <input
                  type="text"
                  value={formData.serialNo}
                  onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIC *</label>
                <input
                  type="text"
                  required
                  value={formData.pic}
                  onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Site</label>
                <select
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="">Select Site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedAsset(null)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditAsset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Update Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Asset</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete asset "{selectedAsset.name}"? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedAsset(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAsset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Details Modal */}
      {showDetailsModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Asset Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Asset Number</label>
                <p className="text-sm text-gray-900">{selectedAsset.noAsset}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Asset Name</label>
                <p className="text-sm text-gray-900">{selectedAsset.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Serial Number</label>
                <p className="text-sm text-gray-900">{selectedAsset.serialNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAsset.status)}`}>
                  {getStatusIcon(selectedAsset.status)}
                  <span className="ml-1">{selectedAsset.status}</span>
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Brand</label>
                <p className="text-sm text-gray-900">{selectedAsset.brand || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Model</label>
                <p className="text-sm text-gray-900">{selectedAsset.model || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">PIC</label>
                <p className="text-sm text-gray-900">{selectedAsset.pic}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Cost</label>
                <p className="text-sm text-gray-900">{selectedAsset.cost ? `$${selectedAsset.cost.toLocaleString()}` : '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Category</label>
                <p className="text-sm text-gray-900">{selectedAsset.category?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Site</label>
                <p className="text-sm text-gray-900">{selectedAsset.site?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Department</label>
                <p className="text-sm text-gray-900">{selectedAsset.department?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">{new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
              </div>
              {selectedAsset.notes && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-sm text-gray-900">{selectedAsset.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedAsset(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Import Assets</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] || null)
                    setImportResult(null)
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium mb-1">CSV format should include:</p>
                <p>noAsset, name, serialNo, cost, status, pic, notes, brand, model, categoryId, siteId, departmentId</p>
              </div>
              {importResult && (
                <div
                  className={`rounded border p-3 text-sm ${
                    importResult.skipped > 0
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                >
                  <div className="font-semibold mb-1">
                    {importResult.skipped > 0
                      ? `Imported ${importResult.imported} of ${importResult.total} rows. Skipped ${importResult.skipped}.`
                      : `All ${importResult.imported} rows imported successfully.`}
                  </div>
                  {importResult.issues.length > 0 && (
                    <div className="space-y-1 text-xs text-red-700">
                      {importResult.issues.slice(0, 6).map((issue, idx) => (
                        <div key={`${issue.row}-${idx}`}>
                          {issue.row ? `Row ${issue.row}: ` : ''}
                          {issue.reason}
                          {issue.fields?.length ? ` (Fields: ${issue.fields.join(', ')})` : ''}
                        </div>
                      ))}
                      {importResult.issues.length > 6 && (
                        <div>...and {importResult.issues.length - 6} more issues.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportResult(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleImportAssets}
                disabled={importing || !importFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
