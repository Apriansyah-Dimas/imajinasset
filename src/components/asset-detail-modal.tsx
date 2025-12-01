'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, History as HistoryIcon, Clock8 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import RoleBasedAccess from '@/components/RoleBasedAccess'
import AdditionalInformation from '@/components/additional-information'
import ImageUpload from '@/components/image-upload'
import AssetImagePlaceholder from '@/components/asset-image-placeholder'
import { getClientAuthToken } from '@/lib/client-auth'
import Image from 'next/image'

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
  startInEditMode?: boolean
  forceReadOnly?: boolean
  sessionContext?: {
    sessionId: string
    entryId: string
    initialIsCrucial?: boolean
    initialCrucialNotes?: string | null
  }
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

type HistoryEntry = {
  id: string
  type: 'CHECK_OUT' | 'CHECK_IN' | 'SO_UPDATE'
  timestamp: string
  summary: string
  details?: any
  source: 'checkout' | 'event'
}

type SessionEntry = {
  id: string
  soSessionId: string
  assetId: string
  scannedAt: string
  status?: string
  isIdentified?: boolean
  isCrucial?: boolean | null
  crucialNotes?: string | null
  tempPurchaseDate?: string | null
  tempName?: string | null
  tempStatus?: string | null
  tempSerialNo?: string | null
  tempPic?: string | null
  tempNotes?: string | null
  tempBrand?: string | null
  tempModel?: string | null
  tempCost?: number | string | null
  tempImageUrl?: string | null
  tempSiteId?: string | null
  tempCategoryId?: string | null
  tempDepartmentId?: string | null
  tempPicId?: string | null
  tempSite?: { id: string; name: string } | null
  tempCategory?: { id: string; name: string } | null
  tempDepartment?: { id: string; name: string } | null
  tempPicEmployee?: {
    id: string
    employeeId?: string | null
    name: string
    email?: string | null
    department?: string | null
    position?: string | null
    isActive?: boolean | null
  } | null
  asset?: Asset | null
}

const normalizeEntryCost = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const mapSessionEntryToAsset = (entry: SessionEntry): Asset => {
  const resolvedCost = normalizeEntryCost(entry.tempCost)
  const resolvedPurchaseDate = entry.tempPurchaseDate ?? entry.asset?.purchaseDate ?? null
  const resolvedSite = entry.tempSite ?? entry.asset?.site ?? null
  const resolvedCategory = entry.tempCategory ?? entry.asset?.category ?? null
  const resolvedDepartment = entry.tempDepartment ?? entry.asset?.department ?? null
  const resolvedPicEmployee = entry.tempPicEmployee ?? entry.asset?.employee ?? null
  const resolvedPicId = entry.tempPicId ?? resolvedPicEmployee?.id ?? entry.asset?.picId
  const resolvedPicName = entry.tempPic ?? resolvedPicEmployee?.name ?? entry.asset?.pic ?? null
  const resolvedImageUrl = entry.tempImageUrl ?? entry.asset?.imageUrl ?? null

  const base: Asset = {
    id: entry.assetId,
    name: entry.asset?.name || entry.tempName || 'Aset tanpa nama',
    noAsset: entry.asset?.noAsset || '-',
    status: entry.asset?.status || entry.tempStatus || 'Unidentified',
    serialNo: entry.asset?.serialNo ?? undefined,
    purchaseDate: resolvedPurchaseDate || undefined,
    cost: resolvedCost ?? entry.asset?.cost,
    brand: entry.asset?.brand,
    model: entry.asset?.model,
    site: resolvedSite,
    category: resolvedCategory,
    department: resolvedDepartment,
    pic: resolvedPicName,
    picId: resolvedPicId,
    imageUrl: resolvedImageUrl,
    notes: entry.tempNotes ?? entry.asset?.notes ?? null,
    employee: resolvedPicEmployee ?? undefined,
    dateCreated: entry.asset?.dateCreated || entry.scannedAt || new Date().toISOString()
  }

  return {
    ...base,
    name: entry.tempName ?? base.name,
    status: entry.tempStatus ?? base.status,
    serialNo: entry.tempSerialNo ?? base.serialNo,
    brand: entry.tempBrand ?? base.brand,
    model: entry.tempModel ?? base.model,
    cost: resolvedCost ?? base.cost,
    notes: entry.tempNotes ?? base.notes,
    pic: resolvedPicName,
    picId: resolvedPicId,
    purchaseDate: resolvedPurchaseDate ?? base.purchaseDate,
    site: resolvedSite,
    category: resolvedCategory,
    department: resolvedDepartment,
    imageUrl: resolvedImageUrl,
    employee: resolvedPicEmployee ?? base.employee
  }
}

export default function AssetDetailModal({
  asset,
  open,
  onOpenChange,
  onUpdate,
  startInEditMode = false,
  forceReadOnly = false,
  sessionContext
}: AssetDetailModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<Asset | null>(null)
  const [originalData, setOriginalData] = useState<Asset | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [masterDataLoading, setMasterDataLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
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
  const isSessionContext = Boolean(sessionContext)
  const [entryCrucial, setEntryCrucial] = useState(false)
  const [entryCrucialNotes, setEntryCrucialNotes] = useState('')
  const sanitizeString = (value?: string | null) => {
    if (value === undefined || value === null) return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  const fetchHistory = async () => {
    if (!asset) return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const response = await fetch(`/api/assets/${asset.id}/history?limit=50`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal memuat riwayat aset')
      }
      setHistory(Array.isArray(data.history) ? data.history : [])
    } catch (error) {
      console.error('Failed to load asset history:', error)
      setHistoryError(error instanceof Error ? error.message : 'Tidak dapat memuat riwayat aset')
    } finally {
      setHistoryLoading(false)
    }
  }

  const openHistory = () => {
    setHistoryOpen(true)
    void fetchHistory()
  }

  const canEdit =
    !forceReadOnly &&
    (user?.role === 'ADMIN' || (sessionContext && user?.role === 'SO_ASSET_USER'))

  const formatHistoryType = (type: HistoryEntry['type']) => {
    if (type === 'CHECK_OUT') return 'Check Out'
    if (type === 'CHECK_IN') return 'Check In'
    return 'SO Update'
  }

  const getHistoryBadgeVariant = (type: HistoryEntry['type']) => {
    if (type === 'CHECK_OUT') return 'default'
    if (type === 'CHECK_IN') return 'secondary'
    return 'outline'
  }

  const renderHistoryDetails = (entry: HistoryEntry) => {
    if (entry.type === 'SO_UPDATE' && entry.details?.changes?.length) {
      return (
        <div className="mt-2 space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-xs">
          {entry.details.sessionName && (
            <div className="font-medium text-gray-700">Session: {entry.details.sessionName}</div>
          )}
          <div className="space-y-1">
            {entry.details.changes.map((change: any, idx: number) => (
              <div key={`${entry.id}-change-${idx}`} className="flex flex-wrap gap-2">
                <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {change.field}
                </span>
                <span className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-700 line-through">
                  {change.before ?? '–'}
                </span>
                <span className="rounded bg-green-50 px-2 py-1 text-[11px] text-green-700">
                  {change.after ?? '–'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (entry.type === 'CHECK_OUT') {
      const assignTo = entry.details?.assignTo
      return (
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-700 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Assign To</div>
            <div className="font-medium">{assignTo?.name ?? '–'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Due Date</div>
            <div>{entry.details?.dueDate ? new Date(entry.details.dueDate).toLocaleString() : '–'}</div>
          </div>
          {entry.details?.department && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Department</div>
              <div>{entry.details.department.name}</div>
            </div>
          )}
          {entry.details?.notes && (
            <div className="sm:col-span-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Notes</div>
              <div>{entry.details.notes}</div>
            </div>
          )}
        </div>
      )
    }

    if (entry.type === 'CHECK_IN') {
      return (
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-700 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Received By</div>
            <div className="font-medium">
              {entry.details?.receivedBy?.name ?? entry.details?.receivedBy ?? '–'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Status</div>
            <div>{entry.details?.status ?? '–'}</div>
          </div>
          {entry.details?.notes && (
            <div className="sm:col-span-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Notes</div>
              <div>{entry.details.notes}</div>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  useEffect(() => {
    if (!asset) return

    const loadAssetData = async () => {
      let assetData: Asset | null = asset

      if (isSessionContext && sessionContext) {
        try {
          const response = await fetch(
            `/api/so-sessions/${sessionContext.sessionId}/entries/${sessionContext.entryId}`,
            { cache: 'no-store' }
          )

          if (response.status === 404) {
            alert('Data sesi tidak ditemukan atau sudah dihapus.')
            onUpdate()
            onOpenChange(false)
            return
          }

          if (response.ok) {
            const data = await response.json()
            const entryData: SessionEntry | undefined = data.entry
            if (entryData) {
              assetData = mapSessionEntryToAsset(entryData)
              setEntryCrucial(Boolean(entryData.isCrucial))
              setEntryCrucialNotes(entryData.crucialNotes || '')
            }
          } else {
            console.warn('Failed to load SO entry, using cached asset data instead.')
          }
        } catch (error) {
          console.error('Error loading session entry:', error)
        }
      } else if (asset?.id) {
        try {
          const response = await fetch(`/api/assets/${asset.id}`, {
            cache: 'no-store',
          })

          if (response.status === 404) {
            alert('Asset not found. The asset may have been deleted by another user.')
            onUpdate()
            onOpenChange(false)
            return
          }

          if (response.ok) {
            assetData = await response.json()
          } else {
            console.warn('Failed to verify asset, using cached data instead.')
          }
        } catch (error) {
          console.error('Error verifying asset:', error)
        }
      }

      if (!assetData) return

      setFormData({ ...assetData })
      setOriginalData({ ...assetData })
      setIsEditing(startInEditMode && !forceReadOnly)

      if (assetData.notes) {
        try {
          const additionalInfo = JSON.parse(assetData.notes)
          const fields = Object.entries(additionalInfo).map(([name, value], index) => ({
            id: Date.now().toString() + index,
            name,
            value: String(value),
          }))
          setAdditionalFields(fields)
        } catch {
          setAdditionalFields([])
        }
      } else {
        setAdditionalFields([])
      }

      const [prefix = 'FA001', categoryPart = 'I', sitePart = '01'] = (assetData.noAsset || '').split('/')
      setAssetPrefix(prefix || 'FA001')
      setAssetSuffix({
        categoryRoman: categoryPart || 'I',
        siteNumber: sitePart || '01',
      })
    }

    loadAssetData()
  }, [
    asset,
    startInEditMode,
    forceReadOnly,
    onOpenChange,
    onUpdate,
    isSessionContext,
    sessionContext?.entryId,
    sessionContext?.sessionId,
  ])

  useEffect(() => {
    if (isSessionContext) {
      setEntryCrucial(Boolean(sessionContext?.initialIsCrucial))
      setEntryCrucialNotes(sessionContext?.initialCrucialNotes || '')
    } else {
      setEntryCrucial(false)
      setEntryCrucialNotes('')
    }
  }, [
    isSessionContext,
    sessionContext?.initialIsCrucial,
    sessionContext?.initialCrucialNotes,
    sessionContext?.entryId
  ])

  useEffect(() => {
    if (forceReadOnly) {
      setIsEditing(false)
      return
    }
    if (open && startInEditMode) {
      setIsEditing(true)
    }
  }, [open, startInEditMode, forceReadOnly])

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

    if (isSessionContext && entryCrucial && !entryCrucialNotes.trim()) {
      alert('Mohon isi keterangan kenapa aset ini ditandai sebagai Pending.')
      return
    }

    setLoading(true)
    try {
      const combinedAssetNumber = `${assetPrefix}/${assetSuffix.categoryRoman}/${assetSuffix.siteNumber}`
      // Convert objects to IDs for API
      const basePayload = {
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

      // Prepare additional information
      const validAdditionalFields = additionalFields.filter(field =>
        field.name.trim() !== ''
      )

      let notesValue: string | null = null
      if (validAdditionalFields.length > 0) {
        const additionalInfo = validAdditionalFields.reduce((acc, field) => {
          acc[field.name] = field.value
          return acc
        }, {} as Record<string, string>)

        notesValue = JSON.stringify(additionalInfo)
      }

      const payload = {
        ...basePayload,
        notes: notesValue
      }

      if (isSessionContext && sessionContext) {
        const token = getClientAuthToken()
        if (!token) {
          throw new Error('Sesi login berakhir, silakan login ulang.')
        }

        const sessionPayload = {
          tempName: payload.name,
          tempStatus: payload.status,
          tempSerialNo: sanitizeString(payload.serialNo),
          tempPic: sanitizeString(formData.employee?.name || formData.pic || null),
          tempPicId: formData.employee?.id || formData.picId || null,
          tempBrand: sanitizeString(payload.brand),
          tempModel: sanitizeString(payload.model),
          tempCost: payload.cost ?? null,
          tempNotes: payload.notes ?? null,
          tempPurchaseDate: payload.purchaseDate || null,
          tempSiteId: payload.siteId || null,
          tempCategoryId: payload.categoryId || null,
          tempDepartmentId: payload.departmentId || null,
          tempImageUrl: payload.imageUrl ?? null,
          isIdentified: true,
          isCrucial: entryCrucial,
          crucialNotes: entryCrucial ? entryCrucialNotes.trim() : null
        }

        const response = await fetch(
          `/api/so-sessions/${sessionContext.sessionId}/entries/${sessionContext.entryId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(sessionPayload)
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Gagal menyimpan perubahan sesi')
        }
      } else {
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
      }

      onUpdate()
      onOpenChange(false)
      setIsEditing(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // If asset is not found, refresh the assets list and close modal
      if (
        !isSessionContext &&
        (errorMessage.includes('Asset not found') || errorMessage.includes('404'))
      ) {
        alert('Asset not found. The asset may have been deleted by another user.')
        onUpdate() // Refresh the assets list
        onOpenChange(false)
        setIsEditing(false)
      } else if (
        !isSessionContext &&
        (errorMessage.includes('not found') || errorMessage.includes('Invalid reference'))
      ) {
        alert(`Failed to update asset: ${errorMessage}. Please check if the selected items still exist.`)
      } else {
        alert(`Failed to save changes: ${errorMessage}`)
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
    if (forceReadOnly || !canEdit) return
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (originalData) {
      setFormData({ ...originalData })
    }
    setIsEditing(false)
    if (isSessionContext) {
      setEntryCrucial(Boolean(sessionContext?.initialIsCrucial))
      setEntryCrucialNotes(sessionContext?.initialCrucialNotes || '')
    }
  }

  if (!formData) return null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader className="pb-4 sm:pb-6">
          <DialogTitle className="text-lg sm:text-xl">Asset Details</DialogTitle>
          {isSessionContext && (
            <p className="text-xs text-primary mt-1">
              Perubahan disimpan pada sesi ini dan baru akan diterapkan ke master asset setelah sesi selesai.
            </p>
          )}
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
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-gray-200 overflow-hidden">
                    <Image
                      src={formData.imageUrl}
                      alt={formData.name}
                      fill
                      sizes="112px"
                      className="object-cover"
                      onError={(e) => {
                        const fallback = e.currentTarget.parentElement?.parentElement?.querySelector('[data-placeholder]') as HTMLElement | null
                        if (fallback) fallback.classList.remove('hidden')
                        e.currentTarget.parentElement?.classList.add('hidden')
                      }}
                      unoptimized
                    />
                  </div>
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
                      className="text-sm bg-white text-foreground"
                    />
                  </div>
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="text-foreground font-medium text-sm truncate">
                      /{assetSuffix.categoryRoman}/{assetSuffix.siteNumber}
                    </span>
                  </div>
                </div>
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
            {isEditing ? (
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="mt-1 text-sm bg-white text-foreground text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="Unidentified" className="text-sm text-black">Unidentified</SelectItem>
                <SelectItem value="Active" className="text-sm text-black">Active</SelectItem>
                <SelectItem value="Broken" className="text-sm text-black">Broken</SelectItem>
                <SelectItem value="Lost/Missing" className="text-sm text-black">Lost/Missing</SelectItem>
                <SelectItem value="Sell" className="text-sm text-black">Sell</SelectItem>
              </SelectContent>
            </Select>
            ) : (
              <Input
                value={formData.status}
                disabled
                className="mt-1 text-sm w-full"
                style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
              />
            )}
          </div>

          <div>
            <Label htmlFor="serialNo" className="text-sm font-medium">Serial No</Label>
            <Input
              id="serialNo"
              value={formData.serialNo || ''}
              onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
              disabled={!isEditing}
              className={`mt-1 text-sm ${isEditing ? 'bg-white text-foreground' : ''}`}
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
              className={`mt-1 text-sm ${isEditing ? 'bg-white text-foreground' : ''}`}
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
              className={`mt-1 text-sm ${isEditing ? 'bg-white text-foreground' : ''}`}
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
              className={`mt-1 text-sm ${isEditing ? 'bg-white text-foreground' : ''}`}
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
              className={`mt-1 text-sm ${isEditing ? 'bg-white text-foreground' : ''}`}
                      style={!isEditing ? { backgroundColor: '#ffffff !important', color: '#000000 !important' } : {}}
            />
          </div>

          <div>
            <Label htmlFor="site" className="text-sm font-medium">Site</Label>
            {masterDataLoading ? (
              <div className="flex items-center justify-center h-9 border rounded-md bg-muted mt-1">
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : isEditing ? (
              <Select
                value={formData.site?.id || ''}
                onValueChange={(value) => {
                  const selectedSite = sites.find(s => s.id === value);
                  setFormData({ ...formData, site: selectedSite });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1 text-sm bg-white text-foreground text-black">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id} className="text-sm text-black">
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.site?.name || 'No site'}
                disabled
                className="mt-1 text-sm w-full"
                style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
              />
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
            ) : isEditing ? (
              <Select
                value={formData.category?.id || ''}
                onValueChange={(value) => {
                  const selectedCategory = categories.find(c => c.id === value);
                  setFormData({ ...formData, category: selectedCategory });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1 text-sm bg-white text-foreground text-black">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-sm text-black">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.category?.name || 'No category'}
                disabled
                className="mt-1 text-sm w-full"
                style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
              />
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
            ) : isEditing ? (
              <Select
                value={formData.department?.id || ''}
                onValueChange={(value) => {
                  const selectedDepartment = departments.find(d => d.id === value);
                  setFormData({ ...formData, department: selectedDepartment });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1 text-sm bg-white text-foreground text-black">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id} className="text-sm text-black">
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.department?.name || 'No department'}
                disabled
                className="mt-1 text-sm w-full"
                style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
              />
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
                <SelectTrigger className="mt-1 text-sm bg-white text-foreground text-black">
                  <SelectValue placeholder={pics.length === 0 ? 'No PIC available' : 'Select PIC'} />
                </SelectTrigger>
                <SelectContent>
                  {pics.length > 0 ? (
                    pics.map((pic) => {
                      const positionLabel = (pic.position || '').trim()
                      const showPosition = positionLabel && positionLabel.toLowerCase() !== 'test'

                      return (
                        <SelectItem key={pic.id} value={pic.id} className="text-sm text-black">
                          <div className="flex flex-col">
                            <span>{pic.name}</span>
                            {showPosition && (
                              <span className="text-xs text-muted-foreground">{positionLabel}</span>
                            )}
                            </div>
                          </SelectItem>
                        )
                      })
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
              <Input
                value={
                  formData.employee
                    ? formData.employee.name
                    : formData.pic
                      ? formData.pic
                      : 'No PIC assigned'
                }
                disabled
                className="mt-1 text-sm w-full"
                style={{ backgroundColor: '#ffffff !important', color: '#000000 !important' }}
              />
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
              readOnly={!isEditing || forceReadOnly}
              mode="edit"
            />
          </div>
        </div>

        {isSessionContext && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <label className="flex items-start gap-3 text-sm text-text-muted">
              <Checkbox
                checked={entryCrucial}
                onCheckedChange={(checked) => {
                  const next = Boolean(checked)
                  setEntryCrucial(next)
                  if (!next) {
                    setEntryCrucialNotes('')
                  }
                }}
                disabled={!isEditing}
                className="mt-1 border-amber-400 text-amber-700 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white"
              />
              <span>
                Tandai aset ini sebagai <span className="font-semibold text-foreground">Pending</span> bila tag fisik salah, kondisi rusak, atau data tidak sinkron.
              </span>
            </label>
            {entryCrucial && (
              isEditing ? (
                <Textarea
                  value={entryCrucialNotes}
                  onChange={(event) => setEntryCrucialNotes(event.target.value)}
                  placeholder="Contoh: Tag aset hilang, label baru diperlukan."
                  className="mt-3 text-sm"
                  rows={3}
                />
              ) : entryCrucialNotes ? (
                <p className="mt-3 text-sm text-text-muted">
                  Keterangan: {entryCrucialNotes}
                </p>
              ) : null
            )}
          </div>
        )}

        {!forceReadOnly ? (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2 space-y-3 sm:space-y-0 mt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {!isSessionContext && (
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
              )}
              <Button
                type="button"
                variant="outline"
                disabled={!asset || loading || deleteLoading}
                onClick={openHistory}
                className="w-full sm:w-auto"
                size="sm"
              >
                <HistoryIcon className="h-4 w-4 mr-2" />
                HISTORY
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {canEdit ? (
                !isEditing ? (
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
                )
              ) : user && user.role === 'SO_ASSET_USER' ? (
                <div className="w-full text-center text-xs text-muted-foreground sm:text-sm">
                  Read-only access - Contact admin to modify asset details
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-surface-border bg-surface/40 p-4 text-center text-xs text-text-muted">
            Detail aset hanya untuk dibaca pada daftar Remaining.
          </div>
        )}
      </DialogContent>
    </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Clock8 className="h-4 w-4" />
              Asset History
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            {historyLoading && (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                Memuat riwayat aset...
              </div>
            )}
            {historyError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {historyError}
              </div>
            )}
            {!historyLoading && !historyError && history.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                Belum ada riwayat untuk aset ini.
              </div>
            )}
            {!historyLoading && history.length > 0 && (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getHistoryBadgeVariant(entry.type)} className="uppercase tracking-wide">
                          {formatHistoryType(entry.type)}
                        </Badge>
                        <span className="text-sm font-semibold text-gray-900">{entry.summary}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {renderHistoryDetails(entry)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
