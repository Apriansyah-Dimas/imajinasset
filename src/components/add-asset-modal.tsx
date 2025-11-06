'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import AdditionalInformation from '@/components/additional-information'
import ImageUpload from '@/components/image-upload'

interface AddAssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface AssetFormData {
  name: string
  noAsset: string
  status: string
  serialNo: string
  purchaseDate: string
  cost: string
  brand: string
  model: string
  siteId: string
  categoryId: string
  departmentId: string
  picId: string
  imageUrl: string
}

export default function AddAssetModal({ open, onOpenChange, onSuccess }: AddAssetModalProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    noAsset: '',
    status: 'Unidentified',
    serialNo: '',
    purchaseDate: '',
    cost: '',
    brand: '',
    model: '',
    siteId: '',
    categoryId: '',
    departmentId: '',
    picId: '',
    imageUrl: ''
  })
  const [loading, setLoading] = useState(false)
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [employees, setEmployees] = useState<Array<{
    id: string
    name: string
    employeeId: string
    email?: string
    department?: string
    position?: string
    isActive: boolean
  }>>([])
  const [additionalFields, setAdditionalFields] = useState<Array<{ id: string; name: string; value: string }>>([])
  const [assetPrefix, setAssetPrefix] = useState('FA001')
  const [assetSuffix, setAssetSuffix] = useState({ categoryRoman: 'I', siteNumber: '01' })

  useEffect(() => {
    if (open) {
      fetchMasterData()
      setAssetPrefix('FA001')
      setAssetSuffix({ categoryRoman: 'I', siteNumber: '01' })
    }
  }, [open])

  const fetchMasterData = async () => {
    try {
      const [sitesRes, categoriesRes, departmentsRes, employeesRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/categories'),
        fetch('/api/departments'),
        fetch('/api/employees')
      ])

      // Handle each response separately to prevent one failure from affecting others
      if (sitesRes.ok) {
        const sitesData = await sitesRes.json()
        setSites(Array.isArray(sitesData) ? sitesData : [])
      } else {
        setSites([])
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      } else {
        setCategories([])
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json()
        setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
      } else {
        setDepartments([])
      }

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        if (Array.isArray(employeesData)) {
          setEmployees(
            employeesData.map((employee: any) => ({
              id: employee.id,
              name: employee.name,
              employeeId: employee.employeeId,
              email: employee.email || undefined,
              department: employee.department || undefined,
              position: employee.position || undefined,
              isActive: employee.isActive ?? true
            }))
          )
        } else {
          setEmployees([])
        }
      } else {
        setEmployees([])
      }
    } catch (error) {
      // Set all to empty arrays on any error
      setSites([])
      setCategories([])
      setDepartments([])
      setEmployees([])
    }
  }

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      noAsset: `${assetPrefix}/${assetSuffix.categoryRoman}/${assetSuffix.siteNumber}`
    }))
  }, [assetPrefix, assetSuffix])

  const generateAssetSuffix = async (categoryId?: string, siteId?: string) => {
    try {
      const params = new URLSearchParams()
      if (categoryId) params.append('categoryId', categoryId)
      if (siteId) params.append('siteId', siteId)

      const response = await fetch(`/api/assets/generate-number?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()

        setAssetSuffix({
          categoryRoman: data.categoryRoman || 'I',
          siteNumber: data.siteNumber || '01'
        })
      }
      // If API fails, do nothing - keep existing asset number
    } catch (error) {
      // Silent error handling - keep existing asset number
    }
  }

  // Generate asset suffix when category or site changes
  useEffect(() => {
    if (open && (formData.categoryId || formData.siteId)) {
      generateAssetSuffix(formData.categoryId, formData.siteId)
    }
  }, [formData.categoryId, formData.siteId])

  // Handle manual noAsset changes while preserving auto-generated suffix
  const handleAssetNumberChange = (value: string) => {
    // Allow decimal format like FA040.1, FA040.13, etc.
    const prefix = value.split('/')[0]?.trim().toUpperCase() || 'FA001'
    // Basic validation to ensure prefix follows expected pattern (letters, numbers, and optional decimal)
    if (prefix.match(/^[A-Z0-9\.]+$/)) {
      setAssetPrefix(prefix)
    }
  }

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const combinedAssetNumber = `${assetPrefix}/${assetSuffix.categoryRoman}/${assetSuffix.siteNumber}`

    // Check all required fields
    const requiredFields: Record<string, string> = {
      'Name of Asset': formData.name,
      'No Asset': combinedAssetNumber,
      'Status': formData.status,
      'Purchase Date': formData.purchaseDate,
      'Cost': formData.cost,
      'Site': formData.siteId,
      'Category': formData.categoryId,
      'Department': formData.departmentId,
    }

    if (employees.length > 0) {
      requiredFields['PIC'] = formData.picId
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value === '')
      .map(([field]) => field)

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return
    }

    // Filter empty additional fields (only save fields with names)
    const validAdditionalFields = additionalFields.filter(field =>
      field.name.trim() !== '' && field.value.trim() !== ''
    )

    setLoading(true)
    try {
      const payload = {
        ...formData,
        noAsset: combinedAssetNumber
      }
      // Create asset first
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        toast.error('Failed to create asset')
        return
      }

      const asset = await response.json()

      // Store additional fields as JSON in a notes field (or create a new field if needed)
      if (validAdditionalFields.length > 0) {
        const additionalInfo = validAdditionalFields.reduce((acc, field) => {
          acc[field.name] = field.value
          return acc
        }, {} as Record<string, string>)

        // Update asset with additional information stored in model field (or create a dedicated field)
        const updateResponse = await fetch(`/api/assets/${asset.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: JSON.stringify(additionalInfo)
          }),
        })

        if (!updateResponse.ok) {
          console.warn('Failed to save additional information, but asset was created successfully')
        }
      }

      toast.success('Asset created successfully')
      onSuccess()
      onOpenChange(false)
      setFormData({
        name: '',
        noAsset: '',
        status: 'Unidentified',
        serialNo: '',
        purchaseDate: '',
        cost: '',
        brand: '',
        model: '',
        siteId: '',
        categoryId: '',
        departmentId: '',
        picId: '',
        imageUrl: ''
      })
      setAdditionalFields([])
    } catch (error) {
      console.error('Failed to create asset:', error)
      toast.error('Failed to create asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-border">
        <DialogHeader className="border-b-2 border-border pb-4">
          <DialogTitle className="text-lg font-semibold">Add New Asset</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Asset Image</Label>
              <p className="text-xs text-gray-500 mb-2">Optional. Upload a square image (max 50KB) to help identify the asset.</p>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
              />
            </div>

            <div>
            <Label htmlFor="name">Name of Asset *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="assetPrefix">No Asset *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="assetPrefix"
                value={assetPrefix}
                onChange={(e) => handleAssetNumberChange(e.target.value)}
                required
                className="flex-1"
                placeholder="FA040.1"
              />
              <div className="whitespace-nowrap rounded border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground">
                /{assetSuffix.categoryRoman}/{assetSuffix.siteNumber}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Edit the prefix on the left (supports decimals like FA040.1). Category and site portions update automatically.
            </p>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              required
            >
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

          <div>
            <Label htmlFor="serialNo">Serial No</Label>
            <Input
              id="serialNo"
              value={formData.serialNo}
              onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="purchaseDate">Purchase Date *</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost (Rp) *</Label>
            <Input
              id="cost"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="site">Site *</Label>
            <Select
              value={formData.siteId}
              onValueChange={(value) => setFormData({ ...formData, siteId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.length > 0 ? (
                  sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-sites-available" disabled>
                    No sites available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories-available" disabled>
                    No categories available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="department">Department *</Label>
            <Select
              value={formData.departmentId}
              onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.length > 0 ? (
                  departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-departments-available" disabled>
                    No departments available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="picId">PIC{employees.length > 0 ? ' *' : ''}</Label>
            <Select
              value={formData.picId}
              onValueChange={(value) => setFormData({ ...formData, picId: value })}
              required={employees.length > 0}
              disabled={employees.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={employees.length === 0 ? 'No employees available' : 'Select PIC'} />
              </SelectTrigger>
              <SelectContent>
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col">
                        <span>{employee.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {employee.employeeId}
                          {employee.position ? ` • ${employee.position}` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-employees" disabled>
                    No employees available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {employees.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Add employees via Admin &gt; Employee Management first.</p>
            )}
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="border-t pt-6">
          <AdditionalInformation
            fields={additionalFields}
            onChange={setAdditionalFields}
            readOnly={false}
            mode="create"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t-2 border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
