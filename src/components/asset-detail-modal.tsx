'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import RoleBasedAccess from '@/components/RoleBasedAccess'
import AdditionalInformation from '@/components/additional-information'
import ImageUpload from '@/components/image-upload'
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
    employeeId?: string | null
    name: string
    email?: string
    department?: string
    position?: string
    isActive?: boolean
  }
  dateCreated: string
}

interface AssetDetailModalProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

// Helper function to format currency with thousand separators
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return ''
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Helper function to parse formatted currency back to number
const parseCurrency = (value: string): number | undefined => {
  const cleanValue = value.replace(/\./g, '')
  const parsed = parseFloat(cleanValue)
  return isNaN(parsed) ? undefined : parsed
}

export default function AssetDetailModal({ asset, open, onOpenChange, onUpdate }: AssetDetailModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<Asset | null>(null)
  const [originalData, setOriginalData] = useState<Asset | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [masterDataLoading, setMasterDataLoading] = useState(false)
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [pics, setPics] = useState<Array<{
    id: string
    name: string
    email?: string
    department?: string
    position?: string
  }>>([])
  const [additionalFields, setAdditionalFields] = useState<Array<{ id: string; name: string; value: string }>>([])
  const [assetPrefix, setAssetPrefix] = useState('FA001')
  const [assetSuffix, setAssetSuffix] = useState({ categoryRoman: 'I', siteNumber: '01' })

  useEffect(() => {
    if (asset) {
      // Verify asset still exists when opening modal
      const verifyAsset = async () => {
        try {
          const response = await fetch(`/api/assets/${asset.id}`)
          if (!response.ok) {
            // Asset doesn't exist, notify parent and close modal
            alert('Asset not found. The asset may have been deleted by another user.')
            onUpdate() // Refresh the assets list
            onOpenChange(false)
            return
          }

          // Asset exists, proceed with setting form data
          setFormData({ ...asset })
          setOriginalData({ ...asset })
          setIsEditing(false)

          // Parse additional information from notes field
          if (asset.notes) {
            try {
              const additionalInfo = JSON.parse(asset.notes)
              const fields = Object.entries(additionalInfo).map(([name, value], index) => ({
                id: Date.now().toString() + index,
                name,
                value: String(value)
              }))
              setAdditionalFields(fields)
            } catch (error) {
              setAdditionalFields([])
            }
          } else {
            setAdditionalFields([])
          }

          // Set asset prefix and suffix
          const [prefix = 'FA001', categoryPart = 'I', sitePart = '01'] = (asset.noAsset || '').split('/')
          setAssetPrefix(prefix || 'FA001')
          setAssetSuffix({
            categoryRoman: categoryPart || 'I',
            siteNumber: sitePart || '01'
          })
        } catch (error) {
          console.error('Error verifying asset:', error)
          setFormData({ ...asset })
          setOriginalData({ ...asset })
          setIsEditing(false)
        }
      }

      verifyAsset();
    }
  }, [asset]);

  useEffect(() => {
    if (open) {
      fetchMasterData()
    }
  }, [open])

  const fetchMasterData = async () => {
    setMasterDataLoading(true);
    try {
      const [sitesRes, categoriesRes, departmentsRes, picsRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/categories'),
        fetch('/api/departments'),
        fetch('/api/pics')
      ])

      const sitesData = await sitesRes.json()
      const categoriesData = await categoriesRes.json()
      const departmentsData = await departmentsRes.json()
      const picsData = await picsRes.json()

      setSites(sitesData)
      setCategories(categoriesData)
      setDepartments(departmentsData)
      setPics(Array.isArray(picsData) ? picsData : [])
    } catch (error) {
      console.error('Failed to fetch master data:', error)
      setPics([])
    } finally {
      setMasterDataLoading(false);
    }
  }

  useEffect(() => {
    setFormData(prev =>
      prev
        ? {
            ...prev,
            noAsset: `${assetPrefix}/${assetSuffix.categoryRoman}/${assetSuffix.siteNumber}`
          }
        : null
    )
  }, [assetPrefix, assetSuffix])

  
  const generateAssetSuffix = async (categoryId?: string, siteId?: string) => {
    try {
      const params = new URLSearchParams()
      if (categoryId) params.append('categoryId', categoryId)
      if (siteId) params.append('siteId', siteId)

      const response = await fetch(`/api/assets/generate-number?${params.toString()}`)
      const data = await response.json()
      setAssetSuffix({
        categoryRoman: data.categoryRoman || 'I',
        siteNumber: data.siteNumber || '01'
      })
    } catch (error) {
      console.error('Failed to generate asset suffix:', error)
    }
  }

  // Generate asset suffix when category or site changes
  useEffect(() => {
    if (formData && (formData.category?.id || formData.site?.id)) {
      generateAssetSuffix(formData.category?.id, formData.site?.id)
    }
  }, [formData?.category?.id, formData?.site?.id])

  // Handle manual noAsset changes while preserving auto-generated suffix
  const handleAssetNumberChange = (value: string) => {
    if (!formData) return

    const prefix = value.split('/')[0]?.trim().toUpperCase() || 'FA001'
    setAssetPrefix(prefix)
  }

  const handleSave = async () => {
    if (!formData) return

    setLoading(true)
    try {
      const combinedAssetNumber = `${assetPrefix}/${assetSuffix.categoryRoman}/${assetSuffix.siteNumber}`
      // Convert objects to IDs for API
      const payload = {
        ...formData,
        noAsset: combinedAssetNumber,
        siteId: formData.site?.id || null,
        categoryId: formData.category?.id || null,
        departmentId: formData.department?.id || null,
        // Remove the object fields to avoid confusion
        site: undefined,
        category: undefined,
        department: undefined,
        employee: undefined,
      }

      // Update asset basic info
      const response = await fetch(`/api/assets/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update asset')
      }

      // Update additional information
      const validAdditionalFields = additionalFields.filter(field =>
        field.name.trim() !== ''
      )

      if (validAdditionalFields.length > 0) {
        const additionalInfo = validAdditionalFields.reduce((acc, field) => {
          acc[field.name] = field.value
          return acc
        }, {} as Record<string, string>)

        const payloadWithNotes = {
          ...payload,
          notes: JSON.stringify(additionalInfo)
        }

        const updateResponse = await fetch(`/api/assets/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payloadWithNotes),
        })

        if (!updateResponse.ok) {
          console.warn('Failed to update additional information, but basic asset info was saved')
        }
      } else {
        // Clear notes if no additional fields
        const payloadWithNotes = {
          ...payload,
          notes: null
        }

        const updateResponse = await fetch(`/api/assets/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payloadWithNotes),
        })

        if (!updateResponse.ok) {
          console.warn('Failed to clear additional information, but basic asset info was saved')
        }
      }

      onUpdate()
      onOpenChange(false)
      setIsEditing(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // If asset is not found, refresh the assets list and close modal
      if (errorMessage.includes('Asset not found') || errorMessage.includes('404')) {
        alert('Asset not found. The asset may have been deleted by another user.')
        onUpdate() // Refresh the assets list
        onOpenChange(false)
        setIsEditing(false)
      } else if (errorMessage.includes('not found') || errorMessage.includes('Invalid reference')) {
        alert(`Failed to update asset: ${errorMessage}. Please check if the selected items still exist.`)
      } else {
        alert(`Failed to update asset: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!formData) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/assets/${formData.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        alert(`Failed to delete asset: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`Failed to delete asset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (originalData) {
      setFormData({ ...originalData })
    }
    setIsEditing(false)
  }

  if (!formData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader className="pb-4 sm:pb-6">
          <DialogTitle className="text-lg sm:text-xl">Asset Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium">Asset Image</Label>
            {isEditing ? (
              <p className="text-xs text-gray-500 mt-1">Upload a square image (max 50KB) for best results.</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Asset image (read-only)</p>
            )}
            {isEditing ? (
              <div className="mt-2">
                <ImageUpload
                  value={formData.imageUrl || ''}
                  onChange={(url) => setFormData(prev => prev ? { ...prev, imageUrl: url } : prev)}
                />
              </div>
            ) : (
              <div className="mt-2 flex items-center">
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt={formData.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-gray-200 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const fallback = e.currentTarget.parentElement?.querySelector('[data-placeholder]') as HTMLElement | null
                      if (fallback) fallback.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div
                  data-placeholder
                  className={formData.imageUrl ? 'hidden' : ''}
                >
                  <AssetImagePlaceholder size="md" />
                </div>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="name" className="text-sm font-medium">Name of Asset</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="noAsset" className="text-sm font-medium">No Asset</Label>
            {isEditing ? (
              <>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-28 flex-shrink-0">
                    <Input
                      id="noAsset"
                      value={assetPrefix}
                      onChange={(e) => handleAssetNumberChange(e.target.value)}
                      placeholder="FA040.1"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="text-foreground font-medium text-sm truncate">
                      /{assetSuffix.categoryRoman}/{assetSuffix.siteNumber}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edit the prefix on the left. Category and site suffix update automatically.
                </p>
              </>
            ) : (
              // View mode: Normal single input
              <Input
                id="noAsset"
                value={formData.noAsset}
                disabled
                className="mt-1 text-sm"
              style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
              />
            )}
          </div>

          <div>
            <Label htmlFor="status" className="text-sm font-medium">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              disabled={!isEditing}
            >
              <SelectTrigger
                className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
              >
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

          <div>
            <Label htmlFor="serialNo" className="text-sm font-medium">Serial No</Label>
            <Input
              id="serialNo"
              value={formData.serialNo || ''}
              onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
              disabled={!isEditing}
              className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div>
            <Label htmlFor="purchaseDate" className="text-sm font-medium">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate ? new Date(formData.purchaseDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              disabled={!isEditing}
              className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div>
            <Label htmlFor="cost" className="text-sm font-medium">Cost (Rp)</Label>
            <Input
              id="cost"
              type="text"
              value={formatCurrency(formData.cost)}
              onChange={(e) => setFormData({ ...formData, cost: parseCurrency(e.target.value) })}
              placeholder={isEditing ? "1.000.000" : ""}
              disabled={!isEditing}
              className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div>
            <Label htmlFor="brand" className="text-sm font-medium">Brand</Label>
            <Input
              id="brand"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              disabled={!isEditing}
              className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div>
            <Label htmlFor="model" className="text-sm font-medium">Model</Label>
            <Input
              id="model"
              value={formData.model || ''}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              disabled={!isEditing}
              className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div>
            <Label htmlFor="site" className="text-sm font-medium">Site</Label>
            {masterDataLoading ? (
              <div className="flex items-center justify-center h-9 border rounded-md bg-muted mt-1">
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <Select
                value={formData.site?.id || ''}
                onValueChange={(value) => {
                  const selectedSite = sites.find(s => s.id === value);
                  setFormData({ ...formData, site: selectedSite });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger
                  className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
                >
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id} className="text-sm">
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!masterDataLoading && sites.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No sites available</p>
            )}
          </div>

          <div>
            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
            {masterDataLoading ? (
              <div className="flex items-center justify-center h-9 border rounded-md bg-muted mt-1">
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <Select
                value={formData.category?.id || ''}
                onValueChange={(value) => {
                  const selectedCategory = categories.find(c => c.id === value);
                  setFormData({ ...formData, category: selectedCategory });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger
                  className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-sm">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!masterDataLoading && categories.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No categories available</p>
            )}
          </div>

          <div>
            <Label htmlFor="department" className="text-sm font-medium">Department</Label>
            {masterDataLoading ? (
              <div className="flex items-center justify-center h-9 border rounded-md bg-muted mt-1">
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <Select
                value={formData.department?.id || ''}
                onValueChange={(value) => {
                  const selectedDepartment = departments.find(d => d.id === value);
                  setFormData({ ...formData, department: selectedDepartment });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger
                  className={`mt-1 text-sm ${!isEditing ? "" : ""}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id} className="text-sm">
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!masterDataLoading && departments.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No departments available</p>
            )}
          </div>

          <div>
            <Label htmlFor="pic" className="text-sm font-medium">PIC</Label>
            {masterDataLoading ? (
              <div className="flex items-center justify-center h-9 border rounded-md bg-muted mt-1">
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : isEditing ? (
              <div className="space-y-2">
                <Select
                  value={formData.picId || ''}
                  onValueChange={(value) => {
                    const selectedPic = pics.find(pic => pic.id === value)
                    if (selectedPic) {
                      setFormData({
                        ...formData,
                        picId: selectedPic.id,
                        pic: null,
                        employee: {
                          id: selectedPic.id,
                          employeeId: null,
                          name: selectedPic.name,
                          email: selectedPic.email,
                          department: selectedPic.department,
                          position: selectedPic.position,
                          isActive: true
                        }
                      })
                    }
                  }}
                  disabled={pics.length === 0}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder={pics.length === 0 ? 'No PIC available' : 'Select PIC'} />
                  </SelectTrigger>
                  <SelectContent>
                    {pics.length > 0 ? (
                      pics.map((pic) => (
                        <SelectItem key={pic.id} value={pic.id} className="text-sm">
                          <div className="flex flex-col">
                            <span>{pic.name}</span>
                            {pic.position && (
                              <span className="text-xs text-muted-foreground">{pic.position}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-pics" disabled>
                        No PIC available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isEditing && (formData.picId || formData.pic) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        pic: null,
                        picId: undefined,
                        employee: undefined
                      })
                    }}
                    className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 text-xs"
                  >
                    Clear PIC
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-1 h-9 flex items-center border rounded-md bg-muted px-3 text-sm text-gray-700">
                {formData.employee
                  ? formData.employee.name
                  : formData.pic
                    ? formData.pic
                    : 'No PIC assigned'}
              </div>
            )}
            {!masterDataLoading && pics.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No PIC available</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="dateCreated" className="text-sm font-medium">Date Created</Label>
            <Input
              id="dateCreated"
              value={new Date(formData.dateCreated).toLocaleDateString()}
              disabled
              className="mt-1 text-sm"
              style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
            />
          </div>

          {/* Additional Information Section */}
          <div className="sm:col-span-2 border-t pt-4">
            <AdditionalInformation
              fields={additionalFields}
              onChange={setAdditionalFields}
              readOnly={!isEditing}
              mode="edit"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2 space-y-3 sm:space-y-0 mt-6">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <RoleBasedAccess allowedRoles={['ADMIN']}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading || deleteLoading}
                    className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 font-bold w-full sm:w-auto"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    DELETE
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      This action cannot be undone. This will permanently delete the asset "{formData.name}" ({formData.noAsset}) from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete Asset'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </RoleBasedAccess>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <RoleBasedAccess allowedRoles={['ADMIN']}>
              {!isEditing ? (
                <Button onClick={handleEdit} disabled={deleteLoading} className="w-full sm:w-auto" size="sm">
                  EDIT
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancelEdit} disabled={loading || deleteLoading} className="w-full sm:w-auto" size="sm">
                    CANCEL
                  </Button>
                  <Button onClick={handleSave} disabled={loading || deleteLoading} className="w-full sm:w-auto" size="sm">
                    {loading ? 'Saving...' : 'SAVE CHANGES'}
                  </Button>
                </>
              )}
            </RoleBasedAccess>
            {user && user.role === 'SO_ASSET_USER' && (
              <div className="w-full text-center text-xs text-muted-foreground sm:text-sm">
                Read-only access - Contact admin to modify asset details
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
