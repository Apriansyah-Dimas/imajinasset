'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface DropdownOptions {
  categories: Array<{ id: string; name: string }>
  sites: Array<{ id: string; name: string }>
  departments: Array<{ id: string; name: string }>
  picOptions: Array<{ id: string; name: string }>
}

export default function AddAssetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    noAsset: '',
    serialNo: '',
    brand: '',
    model: '',
    purchaseDate: '',
    cost: '',
    categoryId: '',
    siteId: '',
    departmentId: '',
    pic: '',
    status: 'Active'
  })

  const [dropdowns, setDropdowns] = useState<DropdownOptions>({
    categories: [],
    sites: [],
    departments: [],
    picOptions: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchDropdowns = async () => {
    try {
      const response = await fetch('/api/dropdowns')
      if (response.ok) {
        const data = await response.json()
        setDropdowns({
          categories: Array.isArray(data.categories) ? data.categories : [],
          sites: Array.isArray(data.sites) ? data.sites : [],
          departments: Array.isArray(data.departments) ? data.departments : [],
          picOptions: Array.isArray(data.picOptions) ? data.picOptions : []
        })
      } else {
        setDropdowns({
          categories: [],
          sites: [],
          departments: [],
          picOptions: []
        })
      }
    } catch (error) {
      setDropdowns({
        categories: [],
        sites: [],
        departments: [],
        picOptions: []
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required'
    }
    if (!formData.noAsset.trim()) {
      newErrors.noAsset = 'Asset number is required'
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required'
    }
    if (!formData.siteId) {
      newErrors.siteId = 'Site is required'
    }
    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required'
    }
    if (!formData.status) {
      newErrors.status = 'Status is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const submitData = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        purchaseDate: formData.purchaseDate || null
      }

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        toast.success('Asset added successfully!')
        router.push('/assets')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add asset')
      }
    } catch (error) {
      console.error('Failed to add asset:', error)
      toast.error('Failed to add asset')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  useEffect(() => {
    fetchDropdowns()
  }, [])

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">BACK TO ASSETS</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ADD NEW ASSET</h1>
        <p className="text-gray-600 text-sm">Enter asset details to register a new asset</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-300">
            <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
              <h2 className="text-sm font-bold">BASIC INFORMATION</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">
                    ASSET NAME *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`border ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500`}
                    placeholder="Enter asset name"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="noAsset" className="block text-xs font-semibold text-gray-700 mb-1">
                    ASSET NUMBER *
                  </Label>
                  <Input
                    id="noAsset"
                    type="text"
                    value={formData.noAsset}
                    onChange={(e) => handleInputChange('noAsset', e.target.value)}
                    className={`border ${errors.noAsset ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500`}
                    placeholder="Enter asset number"
                  />
                  {errors.noAsset && (
                    <p className="text-xs text-red-600 mt-1">{errors.noAsset}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="serialNo" className="block text-xs font-semibold text-gray-700 mb-1">
                    SERIAL NUMBER
                  </Label>
                  <Input
                    id="serialNo"
                    type="text"
                    value={formData.serialNo}
                    onChange={(e) => handleInputChange('serialNo', e.target.value)}
                    className="border border-gray-300 focus:border-blue-500"
                    placeholder="Enter serial number"
                  />
                </div>

                <div>
                  <Label htmlFor="status" className="block text-xs font-semibold text-gray-700 mb-1">
                    STATUS *
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className={`border ${errors.status ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Broken">Broken</SelectItem>
                      <SelectItem value="Lost/Missing">Lost/Missing</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-xs text-red-600 mt-1">{errors.status}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="bg-white border border-gray-300">
            <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
              <h2 className="text-sm font-bold">CLASSIFICATION</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="categoryId" className="block text-xs font-semibold text-gray-700 mb-1">
                    CATEGORY *
                  </Label>
                  <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                    <SelectTrigger className={`border ${errors.categoryId ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns.categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && (
                    <p className="text-xs text-red-600 mt-1">{errors.categoryId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="siteId" className="block text-xs font-semibold text-gray-700 mb-1">
                    SITE *
                  </Label>
                  <Select value={formData.siteId} onValueChange={(value) => handleInputChange('siteId', value)}>
                    <SelectTrigger className={`border ${errors.siteId ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500`}>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns.sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.siteId && (
                    <p className="text-xs text-red-600 mt-1">{errors.siteId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="departmentId" className="block text-xs font-semibold text-gray-700 mb-1">
                    DEPARTMENT *
                  </Label>
                  <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
                    <SelectTrigger className={`border ${errors.departmentId ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500`}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns.departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && (
                    <p className="text-xs text-red-600 mt-1">{errors.departmentId}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-white border border-gray-300">
            <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
              <h2 className="text-sm font-bold">ADDITIONAL DETAILS</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand" className="block text-xs font-semibold text-gray-700 mb-1">
                    BRAND
                  </Label>
                  <Input
                    id="brand"
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="border border-gray-300 focus:border-blue-500"
                    placeholder="Enter brand"
                  />
                </div>

                <div>
                  <Label htmlFor="model" className="block text-xs font-semibold text-gray-700 mb-1">
                    MODEL
                  </Label>
                  <Input
                    id="model"
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="border border-gray-300 focus:border-blue-500"
                    placeholder="Enter model"
                  />
                </div>

                <div>
                  <Label htmlFor="pic" className="block text-xs font-semibold text-gray-700 mb-1">
                    PERSON IN CHARGE (PIC)
                  </Label>
                  <Input
                    id="pic"
                    type="text"
                    value={formData.pic}
                    onChange={(e) => handleInputChange('pic', e.target.value)}
                    className="border border-gray-300 focus:border-blue-500"
                    placeholder="Enter PIC name"
                  />
                </div>

                <div>
                  <Label htmlFor="cost" className="block text-xs font-semibold text-gray-700 mb-1">
                    COST
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    className="border border-gray-300 focus:border-blue-500"
                    placeholder="Enter cost"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="purchaseDate" className="block text-xs font-semibold text-gray-700 mb-1">
                    PURCHASE DATE
                  </Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                    className="border border-gray-300 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white border border-gray-300 p-4">
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
              >
                <X className="h-4 w-4 mr-2" />
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    SAVE ASSET
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
