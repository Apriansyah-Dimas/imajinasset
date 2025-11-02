'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  QrCode, 
  Camera, 
  CameraOff, 
  Upload, 
  RefreshCw, 
  X,
  CheckCircle,
  Smartphone,
  Edit,
  Save,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'

interface ScanResult {
  text: string
  timestamp: Date
  format?: string
  asset?: any
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
  pic: string
}

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [assetNotFound, setAssetNotFound] = useState(false)
  const [showAssetDetail, setShowAssetDetail] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    noAsset: '',
    status: 'Active',
    serialNo: '',
    purchaseDate: '',
    cost: '',
    brand: '',
    model: '',
    siteId: '',
    categoryId: '',
    departmentId: '',
    pic: ''
  })
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanRegionId = 'qr-reader'
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getVideoDevices()
    fetchDropdownData()
    return () => {
      cleanupScanner()
    }
  }, [])

  const fetchDropdownData = async () => {
    try {
      const [sitesRes, categoriesRes, departmentsRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/categories'),
        fetch('/api/departments')
      ])
      
      if (sitesRes.ok) setSites(await sitesRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (departmentsRes.ok) setDepartments(await departmentsRes.json())
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error)
    }
  }

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

  const startScanning = async () => {
    if (!selectedDevice) {
      toast.error('No camera selected')
      return
    }

    if (isScanning) {
      await cleanupScanner()
    }

    setIsScanning(true)
    setScanResult(null)
    setAssetNotFound(false)
    setShowAssetDetail(false)
    setLoading(false)  // Reset loading state when starting new scan

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
          if (decodedText && typeof decodedText === 'string' && decodedText.trim().length > 0 && !loading) {
            handleScanSuccess(decodedText)
          }
        },
        (errorMessage) => {
          // Silently handle scan errors
        }
      )
    } catch (error) {
      console.error('Error starting scanner:', error)
      setIsScanning(false)
      setLoading(false)  // Reset loading on error
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

  const stopScanning = async () => {
    await cleanupScanner()
    setIsScanning(false)
    setLoading(false)  // Reset loading when stopping
  }

  const handleScanSuccess = async (decodedText: string) => {
    if (loading) return
    
    setLoading(true)
    setAssetNotFound(false)
    
    let assetNumber = decodedText.trim()
    
    // Try different approaches to find the asset
    const searchVariations = []
    
    if (assetNumber.includes('/')) {
      const parts = assetNumber.split('/')
      if (parts.length === 3) {
        // Full format: FA026.1/III/01 or FA026/I/01
        searchVariations.push(assetNumber) // Try full format first
        searchVariations.push(parts[0]) // Try just the first part (FA026.1 or FA026)
      }
    } else {
      // Simple format without slashes
      searchVariations.push(assetNumber)
    }
    
    // Try each variation until we find a match
    for (const variation of searchVariations) {
      console.log('Trying search variation:', variation)
      try {
        const apiUrl = `/api/assets/by-number?number=${encodeURIComponent(variation)}`
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const response = await fetch(apiUrl, { 
          signal: controller.signal 
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const asset = await response.json()
          
          if (!asset || !asset.id) {
            toast.error('Invalid asset data received')
            setLoading(false)
            stopScanning()
            return
          }
          
          console.log('Found asset with variation:', variation, 'Asset:', asset)
          toast.success(`Asset found: ${asset.name}`)
          
          const result: ScanResult = {
            text: decodedText,
            timestamp: new Date(),
            format: 'QR_CODE',
            asset: asset
          }
          
          setScanResult(result)
          setLoading(false)
          stopScanning()
          setShowAssetDetail(true)
          return // Found it, exit the loop
        }
      } catch (error) {
        console.log(`Failed to search for variation: ${variation}`, error)
        // Continue to next variation
      }
    }
    
    // If we get here, no variation was found
    setAssetNotFound(true)
    setLoading(false)
    stopScanning()
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
      await handleScanSuccess(result)
    } catch (error) {
      if (error.message.includes('No QR code found')) {
        toast.error('No QR code found in the image')
      } else {
        toast.error('Failed to scan QR code from image')
      }
    }
  }

  const handleScanAgain = () => {
    setAssetNotFound(false)
    setScanResult(null)
    setShowAssetDetail(false)
    setShowEditForm(false)
    setLoading(false)
  }

  const handleEditAsset = () => {
    if (scanResult?.asset) {
      const asset = scanResult.asset
      
      // Format purchase date for input field (YYYY-MM-DD)
      let formattedPurchaseDate = ''
      if (asset.purchaseDate) {
        const date = new Date(asset.purchaseDate)
        if (!isNaN(date.getTime())) {
          formattedPurchaseDate = date.toISOString().split('T')[0]
        }
      }
      
      // Format cost as string for Rupiah display
      let formattedCost = ''
      if (asset.cost !== null && asset.cost !== undefined) {
        formattedCost = formatToRupiah(asset.cost.toString())
      }
      
      setFormData({
        name: asset.name || '',
        noAsset: asset.noAsset || '',
        status: asset.status || 'Active',
        serialNo: asset.serialNo || '',
        purchaseDate: formattedPurchaseDate,
        cost: formattedCost,
        brand: asset.brand || '',
        model: asset.model || '',
        siteId: asset.siteId || '',
        categoryId: asset.categoryId || '',
        departmentId: asset.departmentId || '',
        pic: asset.pic || ''
      })
      setShowEditForm(true)
      setShowAssetDetail(false)
    }
  }

  const handleSaveAsset = async () => {
    if (!scanResult?.asset) return

    setSaving(true)
    try {
      // Prepare data for API - convert cost back to number
      const apiData = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null
      }
      
      const response = await fetch(`/api/assets/${scanResult.asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (response.ok) {
        const updatedAsset = await response.json()
        setScanResult(prev => prev ? { ...prev, asset: updatedAsset } : null)
        toast.success('Asset updated successfully')
        setShowEditForm(false)
        setShowAssetDetail(true)
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update asset: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      toast.error('Failed to update asset')
    } finally {
      setSaving(false)
    }
  }

  const formatToRupiah = (value: string) => {
    // Remove all non-digit characters
    const cleanValue = value.replace(/\D/g, '')
    
    if (cleanValue === '') return ''
    
    // Convert to number and format
    const number = parseInt(cleanValue, 10)
    return `Rp${number.toLocaleString('id-ID')}`
  }

  const parseRupiah = (rupiahString: string) => {
    // Remove 'Rp' and all non-digit characters
    return rupiahString.replace(/[^\d]/g, '')
  }

  const handleInputChange = (field: keyof AssetFormData, value: string) => {
    if (field === 'cost') {
      // For cost field, store the clean value but display formatted
      const cleanValue = parseRupiah(value)
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const switchCamera = async () => {
    const currentIndex = devices.findIndex(device => device.id === selectedDevice)
    const nextIndex = (currentIndex + 1) % devices.length
    const nextDevice = devices[nextIndex]
    
    if (nextDevice) {
      setSelectedDevice(nextDevice.id)
      
      if (isScanning && scannerRef.current) {
        try {
          await cleanupScanner()
          setTimeout(() => {
            startScanning()
          }, 500)
        } catch (error) {
          console.error('Error switching camera:', error)
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">QR Scanner</h1>
                <p className="text-sm text-gray-500">Scan QR codes instantly</p>
              </div>
            </div>
            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                disabled={isScanning}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Switch Camera</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Scanner Section */}
          <div className="relative">
            {/* Scanner Viewport */}
            <div className="relative bg-black aspect-square max-w-md mx-auto">
              <div 
                id={scanRegionId}
                className="w-full h-full"
              />
              
              {/* Overlay when not scanning */}
              {!isScanning && !scanResult && !assetNotFound && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white">
                  <Smartphone className="h-16 w-16 mb-4 opacity-80" />
                  <h2 className="text-xl font-medium mb-2">Ready to Scan</h2>
                  <p className="text-sm text-gray-300 text-center px-8">
                    Position the QR code within the frame to scan
                  </p>
                </div>
              )}

              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white">
                  <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mb-4"></div>
                  <p className="text-lg font-medium">Processing...</p>
                </div>
              )}

              {/* Not Found Overlay */}
              {assetNotFound && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-600 bg-opacity-95 text-white p-8">
                  <X className="h-16 w-16 mb-4" />
                  <h2 className="text-xl font-bold mb-2">Asset Not Found</h2>
                  <p className="text-sm text-center opacity-90 mb-6">
                    The QR code was scanned but no matching asset was found in the database.
                  </p>
                  <Button onClick={handleScanAgain} variant="secondary">
                    Scan Again
                  </Button>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
              <div className="flex justify-center space-x-4">
                {!isScanning ? (
                  <Button
                    onClick={startScanning}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full flex items-center space-x-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Start Scanning</span>
                  </Button>
                ) : (
                  <Button
                    onClick={stopScanning}
                    size="lg"
                    variant="destructive"
                    className="px-8 py-3 rounded-full flex items-center space-x-2"
                  >
                    <CameraOff className="h-5 w-5" />
                    <span>Stop</span>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="bg-white text-gray-900 hover:bg-gray-50 px-6 py-3 rounded-full flex items-center space-x-2"
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Asset Found Section - Moved outside scanner viewport */}
          {scanResult && showAssetDetail && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 m-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-600 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900">Asset Found!</h3>
                    <p className="text-sm text-green-700">Successfully scanned and identified</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 text-lg mb-2">{scanResult.asset.name}</h4>
                <p className="text-gray-600 mb-3">{scanResult.asset.noAsset}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className="ml-2 text-gray-900">{scanResult.asset.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Department:</span>
                    <span className="ml-2 text-gray-900">{scanResult.asset.department?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">PIC:</span>
                    <span className="ml-2 text-gray-900">{scanResult.asset.pic || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={handleEditAsset}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Asset</span>
                </Button>
                <Button 
                  onClick={handleScanAgain}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 px-6 py-2 rounded-full"
                >
                  Scan Again
                </Button>
              </div>
            </div>
          )}

          {/* Edit Form Section - Moved outside scanner viewport */}
          {showEditForm && (
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 m-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => {
                      setShowEditForm(false)
                      setShowAssetDetail(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <h3 className="text-xl font-bold text-gray-900">Edit Asset</h3>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {scanResult?.asset?.noAsset}
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Asset Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter asset name"
                  />
                </div>

                <div>
                  <Label htmlFor="noAsset">Asset Number</Label>
                  <Input
                    id="noAsset"
                    value={formData.noAsset}
                    onChange={(e) => handleInputChange('noAsset', e.target.value)}
                    placeholder="Enter asset number"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Unidentified">Unidentified</SelectItem>
                      <SelectItem value="Broken">Broken</SelectItem>
                      <SelectItem value="Lost/Missing">Lost/Missing</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="serialNo">Serial Number</Label>
                  <Input
                    id="serialNo"
                    value={formData.serialNo}
                    onChange={(e) => handleInputChange('serialNo', e.target.value)}
                    placeholder="Enter serial number"
                  />
                </div>

                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="text"
                    value={formData.cost ? formatToRupiah(formData.cost) : ''}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    placeholder="Rp0"
                  />
                </div>

                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Enter brand"
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="Enter model"
                  />
                </div>

                <div>
                  <Label htmlFor="site">Site</Label>
                  <Select value={formData.siteId} onValueChange={(value) => handleInputChange('siteId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pic">PIC</Label>
                  <Input
                    id="pic"
                    value={formData.pic}
                    onChange={(e) => handleInputChange('pic', e.target.value)}
                    placeholder="Enter PIC name"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8">
                <Button
                  onClick={() => {
                    setShowEditForm(false)
                    setShowAssetDetail(true)
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAsset}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Camera Selection */}
          {devices.length > 0 && (
            <div className="p-6 border-t bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Camera
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label || `Camera ${device.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
            <QrCode className="h-4 w-4" />
            <span>Point your camera at a QR code to scan</span>
          </div>
        </div>
      </div>

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
