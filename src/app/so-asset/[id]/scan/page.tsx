'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Save,
  X,
  ArrowLeft,
  Package,
  Flag,
  RefreshCw,
  Upload,
  Smartphone,
  XCircle,
  CheckCheck
} from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleBasedAccess from '@/components/RoleBasedAccess'
import { useAuth } from '@/contexts/AuthContext'

interface SOAssetEntry {
  id: string
  assetId: string
  scannedAt: string
  status: string
  isIdentified: boolean
  tempName?: string
  tempStatus?: string
  tempSerialNo?: string
  tempPic?: string
  tempPicId?: string
  tempNotes?: string
  tempBrand?: string
  tempModel?: string
  tempCost?: number
  asset: {
    id: string
    noAsset: string
    name: string
    status: string
    serialNo?: string
    pic?: string
    brand?: string
    model?: string
    cost?: number
    dateCreated?: string
    site?: { id: string; name: string }
    category?: { id: string; name: string }
    department?: { id: string; name: string }
    employee?: {
      id: string
      employeeId: string | null
      name: string | null
      email?: string | null
      department?: string | null
      position?: string | null
      isActive?: boolean | null
    }
  }
}

interface SOSession {
  id: string
  name: string
  year: number
  status: string
  totalAssets: number
  scannedAssets: number
}

const formatEmployeeLabel = (employee?: {
  name?: string | null
  employeeId?: string | null
}) => {
  if (!employee?.name) return ''
  return employee.employeeId ? `${employee.name} (${employee.employeeId})` : employee.name
}

function ScanPageContent() {
  const params = useParams()
  const router = useRouter()
  const [session, setSession] = useState<SOSession | null>(null)
  const [scannedAssets, setScannedAssets] = useState<SOAssetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [manualAssetNumber, setManualAssetNumber] = useState('')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<SOAssetEntry | null>(null)
  const [editForm, setEditForm] = useState({
    tempName: '',
    tempStatus: '',
    tempSerialNo: '',
    tempPic: '',
    tempPicId: '',
    tempNotes: '',
    tempBrand: '',
    tempModel: '',
    tempCost: '',
    tempPurchaseDate: '',
    tempSiteId: '',
    tempCategoryId: '',
    tempDepartmentId: '',
    isIdentified: false,
    assetNumber: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sites, setSites] = useState([])
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [pics, setPics] = useState<any[]>([])
  const [scanError, setScanError] = useState('')
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  
  // QR Scanner states
  const [isQRScanning, setIsQRScanning] = useState(false)
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanRegionId = 'qr-reader-so'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalAssets = session?.totalAssets ?? 0
  const scannedCount = session?.scannedAssets ?? 0
  const remainingAssets = Math.max(totalAssets - scannedCount, 0)

  const formatEmployeeLabel = (employee?: {
    name?: string | null
    employeeId?: string | null
  }) => {
    if (!employee?.name) return ''
    return employee.employeeId
      ? `${employee.name} (${employee.employeeId})`
      : employee.name
  }

  useEffect(() => {
    if (params.id) {
      fetchSession()
      fetchScannedAssets()
      fetchMasterData()
      getVideoDevices()
    }

    return () => {
      cleanupScanner()
    }
  }, [params.id])

  const fetchSession = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSession(data?.session ?? data)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch session:', errorData)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    }
  }

  const fetchScannedAssets = async () => {
    try {
      console.log('DEBUG: fetchScannedAssets - Starting fetch for session:', params.id)
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        setScannedAssets([])
        setLoading(false)
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/entries/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to fetch scanned assets:', errorData)
        throw new Error('Failed to fetch scanned assets')
      }

      const data = await response.json()
      console.log('DEBUG: fetchScannedAssets - API response entries:', data.entries?.length || 0)

      if (Array.isArray(data)) {
        console.log('DEBUG: fetchScannedAssets - Setting array directly, count:', data.length)
        console.log('DEBUG: fetchScannedAssets - First entry tempStatus:', data[0]?.tempStatus)
        setScannedAssets(data)
      } else if (Array.isArray(data.entries)) {
        console.log('DEBUG: fetchScannedAssets - Setting entries array, count:', data.entries.length)
        console.log('DEBUG: fetchScannedAssets - First entry tempStatus:', data.entries[0]?.tempStatus)
        console.log('DEBUG: fetchScannedAssets - First entry tempName:', data.entries[0]?.tempName)
        console.log('DEBUG: fetchScannedAssets - First entry full data:', JSON.stringify(data.entries[0], null, 2))
        setScannedAssets(data.entries)
      } else {
        console.log('DEBUG: fetchScannedAssets - No array found, setting empty array')
        setScannedAssets([])
      }
    } catch (error) {
      console.error('DEBUG: fetchScannedAssets - Error fetching scanned assets:', error)
      setScannedAssets([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMasterData = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [sitesRes, categoriesRes, departmentsRes, picsRes] = await Promise.all([
        fetch('/api/sites', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/departments', { headers }),
        fetch('/api/pics', { headers })
      ])

      if (sitesRes.ok) setSites(await sitesRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (departmentsRes.ok) setDepartments(await departmentsRes.json())
      if (picsRes.ok) setPics(await picsRes.json())
    } catch (error) {
      console.error('Error fetching master data:', error)
    }
  }

  const handleManualScan = async () => {
    if (!manualAssetNumber.trim()) return

    setScanning(true)
    setScanError('')

    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        setScanError('Authentication required')
        setScanning(false)
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/scan/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assetNumber: manualAssetNumber.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        const assetNumber = manualAssetNumber.trim()
        setManualAssetNumber('')

        // Auto-open edit dialog with API response data
        await handleScanSuccessAndEdit({
          assetNumber,
          entry: data.entry
        })

        fetchScannedAssets()
        fetchSession()
      } else {
        setScanError(data.error || 'Failed to scan asset')
      }
    } catch (error) {
      setScanError('Network error. Please try again.')
    } finally {
      setScanning(false)
    }
  }
  const handleEditAsset = (asset: SOAssetEntry) => {
    setSelectedAsset(asset)
    const employeeLabel = asset.tempPic || formatEmployeeLabel(asset.asset?.employee)
    const employeeId = asset.asset?.employee?.id ?? ''
    const resolvedPicId = employeeId || employeeLabel || ''

    setEditForm({
      tempName: asset.tempName || asset.asset.name || '',
      tempStatus: asset.tempStatus || asset.asset.status || 'Unidentified',
      tempSerialNo: asset.tempSerialNo || asset.asset.serialNo || '',
      tempPic: employeeLabel || asset.asset.pic || '',
      tempPicId: resolvedPicId,
      tempNotes: asset.tempNotes || '',
      tempBrand: asset.tempBrand || asset.asset.brand || '',
      tempModel: asset.tempModel || asset.asset.model || '',
      tempCost: asset.tempCost?.toString() || asset.asset.cost?.toString() || '',
      tempPurchaseDate: asset.asset.dateCreated ? new Date(asset.asset.dateCreated).toISOString().split('T')[0] : '',
      tempSiteId: asset.asset.site?.id || '',
      tempCategoryId: asset.asset.category?.id || '',
    tempDepartmentId: asset.asset.department?.id || '',
    isIdentified: asset.isIdentified,
    assetNumber: asset.asset.noAsset || ''
  })
    setShowEditDialog(true)
  }

  const handleScanSuccessAndEdit = async (assetData: any) => {
    // Show success message
    toast.success(`Asset scanned: ${assetData.assetNumber}`)

    // If we have API response data, use it immediately
    if (assetData.entry) {
      console.log('Using API response entry:', assetData.entry)
      handleEditAsset(assetData.entry)
      return
    }

    // Wait a moment for state to update and user to see success message
    setTimeout(async () => {
      try {
        // Find newly scanned asset - this should now be in scannedAssets
        const newAsset = scannedAssets.find(entry =>
          entry.asset.noAsset === assetData.assetNumber
        )

        if (newAsset) {
          console.log('Found new asset:', newAsset)
          handleEditAsset(newAsset)
        } else {
          // If not found in scannedAssets, try to get it directly from API
          console.log('Asset not found in scannedAssets, fetching from API...')
          // Get token from localStorage
          const token = localStorage.getItem('auth_token')
          if (token) {
            const response = await fetch(`/api/so-sessions/${params.id}/entries/?search=${encodeURIComponent(assetData.assetNumber)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            if (response.ok) {
              const responseData = await response.json()
              const entries = Array.isArray(responseData)
                ? responseData
                : Array.isArray(responseData.entries)
                  ? responseData.entries
                  : []
              const latestEntry = entries.find((entry: any) => entry.asset?.noAsset === assetData.assetNumber)
              if (latestEntry) {
                console.log('Found asset from API:', latestEntry)
                handleEditAsset(latestEntry)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error finding scanned asset for edit:', error)
        toast.error('Unable to open edit dialog for scanned asset')
      }
    }, 1000) // Increased timeout to ensure state is updated
  }

  const handleSaveEdit = async () => {
    if (!selectedAsset) return

    try {
      console.log('DEBUG: Frontend - editForm before sending:', editForm)
      console.log('DEBUG: Frontend - tempStatus value:', editForm.tempStatus)
      console.log('DEBUG: Frontend - tempPic value:', editForm.tempPic)

      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/entries/${selectedAsset.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      const data = await response.json()

      if (response.ok) {
        console.log('DEBUG: Frontend - API response successful:', data)
        console.log('DEBUG: Frontend - Updated entry tempStatus:', data.entry?.tempStatus)
        toast.success('Asset updated successfully!')
        setShowEditDialog(false)
        setSelectedAsset(null)
        
        // Force refresh with a small delay to ensure database is updated
        setTimeout(() => {
          fetchScannedAssets()
        }, 500)
      } else {
        console.error('DEBUG: Frontend - Save failed:', data)
        toast.error(data.error || 'Failed to update asset')
      }
    } catch (error) {
      console.error('Error updating asset:', error)
      toast.error('Network error. Please try again.')
    }
  }

  const generateAssetNumber = async (siteId: string, categoryId: string) => {
    if (!siteId || !categoryId) return ''

    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        return ''
      }

      const params = new URLSearchParams({ siteId, categoryId })
      console.log('DEBUG: Generating asset number with params:', params.toString())
      
      const response = await fetch(`/api/assets/generate-number?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: API response for asset number generation:', data)
        console.log('DEBUG: data.assetNumber:', data.assetNumber)
        console.log('DEBUG: data.number:', data.number)
        
        // Fix: Use the correct field name from API response
        const assetNumber = data.number || data.assetNumber || ''
        console.log('DEBUG: Final asset number to return:', assetNumber)
        return assetNumber
      }
    } catch (error) {
      console.error('Error generating asset number:', error)
    }

    return ''
  }

  const handleSiteChange = async (siteId: string) => {
    console.log('DEBUG: handleSiteChange called with siteId:', siteId)
    console.log('DEBUG: Current categoryId:', editForm.tempCategoryId)

    setEditForm(prev => ({
      ...prev,
      tempSiteId: siteId
    }))

    // Auto-generate asset number if both site and category are selected
    const categoryId = editForm.tempCategoryId
    if (siteId && categoryId) {
      console.log('DEBUG: Both site and category selected, generating asset number...')
      const newAssetNumber = await generateAssetNumber(siteId, categoryId)
      console.log('DEBUG: Generated asset number:', newAssetNumber)
      if (newAssetNumber) {
        setEditForm(prev => ({
          ...prev,
          assetNumber: newAssetNumber
        }))
      }
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    console.log('DEBUG: handleCategoryChange called with categoryId:', categoryId)
    console.log('DEBUG: Current siteId:', editForm.tempSiteId)

    setEditForm(prev => ({
      ...prev,
      tempCategoryId: categoryId
    }))

    // Auto-generate asset number if both site and category are selected
    const siteId = editForm.tempSiteId
    if (categoryId && siteId) {
      console.log('DEBUG: Both category and site selected, generating asset number...')
      const newAssetNumber = await generateAssetNumber(siteId, categoryId)
      console.log('DEBUG: Generated asset number:', newAssetNumber)
      if (newAssetNumber) {
        setEditForm(prev => ({
          ...prev,
          assetNumber: newAssetNumber
        }))
      }
    }
  }

  const handleCompleteSO = async () => {
    setCompleting(true)
    try {
      console.log('DEBUG: Starting SO completion for session:', params.id)
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        toast.error('Authentication required')
        setCompleting(false)
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/complete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('DEBUG: SO completion response:', data)

      if (response.ok) {
        console.log('DEBUG: SO completed successfully, assets updated:', data.assetsUpdated)
        setShowCompleteDialog(false)
        router.push('/so-asset')
      } else {
        console.error('DEBUG: SO completion failed:', data)
        toast.error(data.error || 'Failed to complete session')
      }
    } catch (error) {
      console.error('DEBUG: Error completing SO:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  const handleCancelSO = async () => {
    setCancelling(true)
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        toast.error('Authentication required')
        setCancelling(false)
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/cancel/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setShowCancelDialog(false)
        router.push('/so-asset')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to cancel session')
      }
    } catch (error) {
      console.error('Error cancelling SO:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  
  const getProgressPercentage = () => {
    if (!session || totalAssets === undefined || totalAssets === null || totalAssets === 0) return 0
    const scanned = scannedCount || 0
    return Math.round((scanned / totalAssets) * 100)
  }

  const getIdentifiedCount = () => {
    return scannedAssets.filter(entry => entry.isIdentified).length
  }

  const getDisplayLimit = () => 5 // Limit to 5 assets per section

  const getIdentifiedPercentage = () => {
    if (scannedAssets.length === 0) return 0
    return Math.round((getIdentifiedCount() / scannedAssets.length) * 100)
  }

  
  // QR Scanner functions
  const getVideoDevices = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      setDevices(devices)
      if (devices.length > 0) {
        setSelectedDevice(devices[0].id)
      }
    } catch (error) {
      console.error('Error getting video devices:', error)
    }
  }

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (error) {
        console.debug('Scanner cleanup error (ignored):', error)
      } finally {
        scannerRef.current = null
      }
    }
  }

  const startQRScanning = async () => {
    if (!selectedDevice) {
      toast.error('No camera selected')
      return
    }

    if (isQRScanning) {
      await cleanupScanner()
    }

    setIsQRScanning(true)
    setScanError('')

    try {
      const scanner = new Html5Qrcode(scanRegionId)
      scannerRef.current = scanner

      await scanner.start(
        selectedDevice,
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          if (decodedText && typeof decodedText === 'string' && decodedText.trim().length > 0) {
            handleQRScanSuccess(decodedText)
          }
        },
        (errorMessage) => {
          // Silently handle scan errors
        }
      )
    } catch (error) {
      console.error('Error starting QR scanner:', error)
      setIsQRScanning(false)
      scannerRef.current = null

      if (error instanceof Error) {
        if (error.message.includes('NotAllowedError')) {
          toast.error('Camera access denied. Please allow camera permissions')
        } else if (error.message.includes('NotFoundError')) {
          toast.error('No camera found. Please connect a camera device')
        } else {
          toast.error('Failed to start camera scanner')
        }
      }
    }
  }

  const stopQRScanning = async () => {
    await cleanupScanner()
    setIsQRScanning(false)
  }

  const handleQRScanSuccess = async (decodedText: string) => {
    let assetNumber = decodedText.trim()

    if (scanning) return // Prevent multiple simultaneous scans

    setScanning(true)
    setScanError('')

    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('No auth token found')
        setScanError('Authentication required')
        setScanning(false)
        return
      }

      const response = await fetch(`/api/so-sessions/${params.id}/scan/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assetNumber })
      })

      const data = await response.json()

      if (response.ok) {
        // Auto-open edit dialog with API response data
        await handleScanSuccessAndEdit({
          assetNumber,
          entry: data.entry
        })

        fetchScannedAssets()
        fetchSession()
        stopQRScanning()
      } else {
        setScanError(data.error || 'Failed to scan asset')
        toast.error(data.error || 'Failed to scan asset')
      }
    } catch (error) {
      setScanError('Network error. Please try again.')
      toast.error('Network error. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    const scanner = new Html5Qrcode(scanRegionId)

    try {
      const result = await scanner.scanFile(file, true)
      await handleQRScanSuccess(result)
    } catch (error: any) {
      if (error.message.includes('No QR code found')) {
        toast.error('No QR code found in image')
      } else {
        toast.error('Failed to scan QR code from image')
      }
    }
  }

  const switchCamera = async () => {
    const currentIndex = devices.findIndex((device: any) => device.id === selectedDevice)
    const nextIndex = (currentIndex + 1) % devices.length
    const nextDevice = devices[nextIndex]

    if (nextDevice) {
      setSelectedDevice(nextDevice.id)

      if (isQRScanning && scannerRef.current) {
        try {
          await cleanupScanner()
          setTimeout(() => {
            startQRScanning()
          }, 500)
        } catch (error) {
          console.error('Error switching camera:', error)
        }
      }
    }
  }

  const filteredAssets = scannedAssets.filter(entry =>
    entry.asset.noAsset?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.asset.serialNo?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading session...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Session not found</AlertDescription>
        </Alert>
      </div>
    )
  }


  return (
    <div className="container mx-auto py-3 px-1.5 sm:py-6 sm:px-4 max-w-7xl min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/so-asset">
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{session.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Stock Opname {session.year}</p>
          </div>
          <Badge variant={session.status === 'Active' ? 'default' : 'secondary'} className="flex-shrink-0">
            {session.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <RoleBasedAccess allowedRoles={['ADMIN']}>
            {getIdentifiedCount() > 0 && (
              <Button
                onClick={() => setShowCompleteDialog(true)}
                variant="default"
                size="sm"
                className="flex-shrink-0 bg-green-600 hover:bg-green-700"
              >
                <CheckCheck className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Complete</span>
              </Button>
            )}
            {scannedCount > 0 && (
              <Button
                onClick={() => setShowCancelDialog(true)}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <XCircle className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            )}
          </RoleBasedAccess>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Scanning Progress</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {scannedCount} of {totalAssets} assets scanned
              </p>
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ {getIdentifiedCount()} assets verified
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-xl sm:text-2xl font-bold">{getProgressPercentage()}%</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
          <Progress value={getProgressPercentage()} className="mt-3 sm:mt-4" />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2 grid-cols-1">
        {/* Scanner & Controls */}
        <div className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="flex items-center gap-1 sm:gap-2 text-sm sm:text-lg">
                <QrCode className="h-3 w-3 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Asset Scanner</span>
                <span className="sm:hidden">Scanner</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-4 px-3 sm:px-6">
              {/* QR Scanner */}
              <div className="relative bg-black aspect-square sm:aspect-square rounded-lg overflow-hidden">
                <div id={scanRegionId} className="w-full h-full" />
 
                {!isQRScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white px-4">
                    <Smartphone className="h-8 w-8 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-80" />
                    <p className="text-xs sm:text-sm text-center">Ready to scan</p>
                  </div>
                )}
 
                {scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white px-4">
                    <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-white border-t-transparent rounded-full mb-2 sm:mb-3"></div>
                    <p className="text-xs sm:text-sm text-center">Processing...</p>
                  </div>
                )}
              </div>

              {/* Scanner Controls */}
              <div className="flex gap-1 sm:gap-2">
                {!isQRScanning ? (
                  <Button onClick={startQRScanning} className="flex-1 px-1 sm:px-3">
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="text-xs sm:text-sm">Camera</span>
                  </Button>
                ) : (
                  <Button onClick={stopQRScanning} variant="destructive" className="flex-1 px-1 sm:px-3">
                    <CameraOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="text-xs sm:text-sm">Stop</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isQRScanning}
                  className="px-1 sm:px-2"
                >
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                {devices.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={switchCamera}
                    disabled={isQRScanning}
                    className="px-1 sm:px-2"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>

              {/* Manual Input */}
              <div className="space-y-1">
                <Label htmlFor="assetNumber" className="text-xs font-medium">
                  Manual Entry
                </Label>
                <div className="flex gap-1">
                  <Input
                    id="assetNumber"
                    value={manualAssetNumber}
                    onChange={(e) => setManualAssetNumber(e.target.value)}
                    placeholder="e.g., FA001/I/01"
                    onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                    className="flex-1 text-xs"
                  />
                  <Button
                    onClick={handleManualScan}
                    disabled={scanning || !manualAssetNumber.trim()}
                    className="px-2"
                  >
                    <span className="text-xs">+</span>
                  </Button>
                </div>
              </div>

              {scanError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {scannedCount === totalAssets && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Session Complete!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => setShowCompleteDialog(true)} className="w-full">
                  <Flag className="h-4 w-4 mr-2" />
                  Complete Stock Opname
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Asset Lists */}
        <div className="space-y-2 sm:space-y-4">
          {/* Recently Scanned */}
          <Card>
            <CardHeader className="pb-1 sm:pb-3 px-3 sm:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-lg">Scanned</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {scannedAssets.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {scannedAssets.length === 0 ? (
                <div className="text-center py-4 sm:py-8 text-muted-foreground">
                  <Package className="h-6 w-6 sm:h-12 sm:w-12 mx-auto mb-1 sm:mb-3 opacity-30" />
                  <p className="text-xs sm:text-sm">No assets scanned</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-48 sm:max-h-96 overflow-y-auto">
                  {scannedAssets.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-1.5 sm:p-3 rounded border ${
                        entry.isIdentified
                          ? 'bg-green-50 border-green-200'
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="font-medium text-xs truncate">{entry.asset.noAsset}</span>
                          <Badge
                            variant={entry.isIdentified ? "default" : "secondary"}
                            className="text-xs px-1 py-0"
                          >
                          {entry.isIdentified ? "✓" : "?"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1 py-0 ${
                              entry.tempStatus === 'Active' ? 'border-green-500 text-green-700' :
                              entry.tempStatus === 'Broken' ? 'border-red-500 text-red-700' :
                              entry.tempStatus === 'Lost/Missing' ? 'border-orange-500 text-orange-700' :
                              'border-gray-500 text-gray-700'
                            }`}
                          >
                            {entry.tempStatus}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.tempName || entry.asset.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAsset(entry)}
                        className="p-0.5 sm:p-2 flex-shrink-0"
                      >
                        <Edit className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}

                  {scannedAssets.length > 5 && (
                    <div className="text-center pt-1">
                      <Link href={`/so-asset/${params.id}/identified-assets`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          View All ({scannedAssets.length})
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Card>
              <CardContent className="pt-2 sm:pt-4 px-3 sm:px-6">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5 h-5 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCheck className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-green-700" />
                  </div>
                  <div>
                    <div className="text-base sm:text-2xl font-bold">{getIdentifiedCount()}</div>
                    <div className="text-xs text-muted-foreground">Verified</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-2 sm:pt-4 px-3 sm:px-6">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5 h-5 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Package className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-orange-700" />
                  </div>
                  <div>
                    <div className="text-base sm:text-2xl font-bold">
                      {remainingAssets}
                    </div>
                    <div className="text-xs text-muted-foreground">Left</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <Card>
            <CardContent className="pt-2 sm:pt-4 px-3 sm:px-6">
              <div className="grid grid-cols-2 gap-1.5">
                <Link href={`/so-asset/${params.id}/identified-assets`}>
                  <Button variant="outline" className="w-full text-xs px-1 py-1">
                    <CheckCheck className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5" />
                    <span>All</span>
                  </Button>
                </Link>
                <Link href={`/so-asset/${params.id}/unidentified-assets`}>
                  <Button variant="outline" className="w-full text-xs px-1 py-1">
                    <Package className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5" />
                    <span>Left</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complete SO Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="w-10/11 sm:w-full mx-auto max-w-md">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Complete Stock Opname</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to complete this stock opname session?
              This will update the main asset list with all changes made during this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-muted p-3 sm:p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Session Summary:</h4>
              <div className="text-xs sm:text-sm space-y-1">
                <div>Session: {session?.name}</div>
                <div>Assets Scanned: {session?.scannedAssets}</div>
                <div>Assets Verified: {getIdentifiedCount()}</div>
                <div>Total Assets: {session?.totalAssets}</div>
                <div>Progress: {getProgressPercentage()}%</div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                This action cannot be undone. All temporary changes will be applied to the main asset list.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCompleteSO} disabled={completing} className="w-full sm:w-auto">
                {completing ? (
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                ) : (
                  <Flag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                Complete SO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-10/11 sm:w-full mx-auto">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Edit Asset Information</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Update asset details for this stock opname session
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-3 sm:space-y-4">
              {/* Asset Info Header */}
              <div className="bg-muted/50 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <div className="font-semibold text-sm sm:text-lg truncate">{selectedAsset?.asset?.noAsset || ''}</div>
                      <Badge variant="outline" className="text-xs self-start">
                        Semi-auto
                      </Badge>
                    </div>
                  </div>
                  <Badge
                    variant={editForm.isIdentified ? "default" : "secondary"}
                    className={editForm.isIdentified ? "bg-green-100 text-green-800 border-green-200" : ""}
                  >
                    {editForm.isIdentified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>

              {/* Responsive Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* First Row - Asset Number & Asset Name */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="assetNumber" className="text-xs sm:text-sm font-medium">Asset Number</Label>
                  <Input
                    id="assetNumber"
                    value={editForm.assetNumber || selectedAsset?.asset?.noAsset || ''}
                    disabled
                    className="bg-gray-100 text-gray-700 text-xs sm:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Asset number generated from the selected category and site
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tempName" className="text-xs sm:text-sm font-medium">Asset Name</Label>
                  <Input
                    id="tempName"
                    value={editForm.tempName}
                    onChange={(e) => setEditForm({ ...editForm, tempName: e.target.value })}
                    placeholder="Enter asset name"
                    className="text-xs sm:text-sm"
                  />
                </div>

                {/* Second Row - Status */}
                <div className="space-y-2">
                  <Label htmlFor="tempStatus" className="text-xs sm:text-sm font-medium">Status</Label>
                  <Select value={editForm.tempStatus} onValueChange={(value) => setEditForm({ ...editForm, tempStatus: value })}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select status" />
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

                {/* Third Row - Site & Category */}
                <div className="space-y-2">
                  <Label htmlFor="tempSiteId" className="text-xs sm:text-sm font-medium">Site</Label>
                  <Select value={editForm.tempSiteId} onValueChange={handleSiteChange}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site: any) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tempCategoryId" className="text-xs sm:text-sm font-medium">Category</Label>
                  <Select value={editForm.tempCategoryId} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Third Row - Brand & Model */}
                <div className="space-y-2">
                  <Label htmlFor="tempBrand" className="text-xs sm:text-sm font-medium">Brand</Label>
                  <Input
                    id="tempBrand"
                    value={editForm.tempBrand}
                    onChange={(e) => setEditForm({ ...editForm, tempBrand: e.target.value })}
                    placeholder="Enter brand"
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tempModel" className="text-xs sm:text-sm font-medium">Model</Label>
                  <Input
                    id="tempModel"
                    value={editForm.tempModel}
                    onChange={(e) => setEditForm({ ...editForm, tempModel: e.target.value })}
                    placeholder="Enter model"
                    className="text-xs sm:text-sm"
                  />
                </div>

                {/* Fourth Row - Serial Number & PIC */}
                <div className="space-y-2">
                  <Label htmlFor="tempSerialNo" className="text-xs sm:text-sm font-medium">Serial Number</Label>
                  <Input
                    id="tempSerialNo"
                    value={editForm.tempSerialNo}
                    onChange={(e) => setEditForm({ ...editForm, tempSerialNo: e.target.value })}
                    placeholder="Enter serial number"
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Select
                    value={editForm.tempPicId || undefined}
                    onValueChange={(value) => {
                      const selected = pics.find((pic: any) => pic.id === value)
                      setEditForm({
                        ...editForm,
                        tempPicId: value,
                        tempPic: selected?.name || ''
                      })
                    }}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select PIC" />
                    </SelectTrigger>
                    <SelectContent>
                      {pics.map((pic: any) => (
                        <SelectItem key={pic.id} value={pic.id}>
                          {pic.name}
                        </SelectItem>
                      ))}
                      {editForm.tempPicId &&
                        editForm.tempPic &&
                        !pics.some((pic: any) => pic.id === editForm.tempPicId) && (
                          <SelectItem value={editForm.tempPicId} disabled>
                            {editForm.tempPic}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes (Full Width) */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tempNotes" className="text-xs sm:text-sm font-medium">Notes</Label>
                  <Textarea
                    id="tempNotes"
                    value={editForm.tempNotes}
                    onChange={(e) => setEditForm({ ...editForm, tempNotes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes (optional)"
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Verification Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t gap-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Checkbox
                    id="isIdentified"
                    checked={editForm.isIdentified}
                    onCheckedChange={(checked) => {
                      console.log('Checkbox changed:', checked);
                      setEditForm({ ...editForm, isIdentified: checked as boolean });
                    }}
                    className="cursor-pointer"
                  />
                  <Label htmlFor="isIdentified" className="text-xs sm:text-sm font-medium cursor-pointer">
                    Asset verified and complete
                  </Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="w-full sm:w-auto px-3 sm:px-6 py-1.5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="w-full sm:w-auto px-3 sm:px-6 py-1.5"
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel SO Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="w-10/11 sm:w-full mx-auto max-w-md">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Cancel Stock Opname</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to cancel this stock opname session?
              This will delete all scanned assets and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-muted p-3 sm:p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Session Summary:</h4>
              <div className="text-xs sm:text-sm space-y-1">
                <div>Session: {session?.name}</div>
                <div>Assets Scanned: {session?.scannedAssets}</div>
                <div>Total Assets: {session?.totalAssets}</div>
                <div>Progress: {getProgressPercentage()}%</div>
              </div>
            </div>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                <strong>Warning:</strong> This action cannot be undone. All scanned assets will be deleted and the session will be cancelled.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="w-full sm:w-auto">
                No, Continue Scanning
              </Button>
              <Button variant="destructive" onClick={handleCancelSO} disabled={cancelling} className="w-full sm:w-auto">
                {cancelling ? (
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                ) : (
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                Yes, Cancel SO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

  
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  )
}

export default function ScanPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SO_ASSET_USER']}>
      <ScanPageContent />
    </ProtectedRoute>
  )
}
