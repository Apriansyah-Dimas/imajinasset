'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Camera, Upload, AlertCircle, RefreshCw } from 'lucide-react'
import { AlertCircle as AlertCircleIcon } from 'lucide-react'

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
  imageUrl?: string | null
  dateCreated: string
}

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameras(videoDevices)
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId)
      }
    } catch (err) {
      console.error('Error getting cameras:', err)
    }
  }

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: 'environment'
        }
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      
      setIsCameraActive(true)
      setIsScanning(true)
      setError(null)
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    setIsScanning(false)
  }

  const captureFrame = async () => {
    if (!videoRef.current) return null
    
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      return canvas.toDataURL('image/jpeg')
    }
    return null
  }

  const simulateQRCodeScan = async (imageData?: string) => {
    setIsProcessing(true)
    setError(null)
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulate QR code detection - randomly succeed or fail
    const shouldSucceed = Math.random() > 0.3 // 70% success rate
    
    if (shouldSucceed) {
      // Simulate finding a random asset
      try {
        const response = await fetch('/api/assets')
        const data = await response.json()
        const assets = data.assets || []
        
        if (assets.length > 0) {
          const randomAsset = assets[Math.floor(Math.random() * assets.length)]
          setAsset(randomAsset)
        } else {
          setError('No assets found in database')
        }
      } catch (err) {
        setError('Failed to fetch asset data')
      }
    } else {
      setError('Asset not found')
    }
    
    setIsProcessing(false)
    stopCamera()
  }

  const startScanning = async () => {
    await getCameras()
    await startCamera()
    
    // Start continuous scanning
    const scanInterval = setInterval(async () => {
      if (isScanning && videoRef.current && videoRef.current.readyState === 4) {
        const imageData = await captureFrame()
        if (imageData) {
          // Simulate QR code detection
          clearInterval(scanInterval)
          await simulateQRCodeScan(imageData)
        }
      }
    }, 1000)
    
    // Stop scanning after 30 seconds if nothing found
    setTimeout(() => {
      clearInterval(scanInterval)
      if (isScanning) {
        stopCamera()
        setError('Scanning timeout. Please try again.')
      }
    }, 30000)
  }

  const stopScanning = () => {
    stopCamera()
    setIsScanning(false)
    setIsProcessing(false)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Simulate processing the uploaded image
      await new Promise(resolve => setTimeout(resolve, 2000))
      await simulateQRCodeScan()
    } catch (err) {
      setError('Failed to process image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAsset = async () => {
    if (!asset) return
    
    setIsSaving(true)
    try {
      // Simulate saving asset record
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Asset saved:', asset)
      handleReset()
    } catch (err) {
      setError('Failed to save asset record')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setAsset(null)
    setError(null)
    setIsSaving(false)
    setIsProcessing(false)
    stopCamera()
  }

  return (
    <div className="space-y-4 px-2 sm:px-0">
      {!asset && !error && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-8">
            <div className="text-center space-y-4 sm:space-y-6">
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '200px', maxHeight: '60vh' }}>
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 sm:h-80">
                    <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center px-4">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm sm:text-base">Processing QR code...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Selection */}
              {cameras.length > 1 && (
                <div className="flex justify-center">
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full max-w-xs"
                  >
                    {cameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                {!isScanning ? (
                  <>
                    <Button
                      onClick={startScanning}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                      size={isMobile ? "lg" : "default"}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Start Scanning</span>
                          <span className="sm:hidden">Scan</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                      size={isMobile ? "lg" : "default"}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Upload Image</span>
                      <span className="sm:hidden">Upload</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={stopScanning}
                    variant="destructive"
                    className="w-full sm:w-auto"
                    size={isMobile ? "lg" : "default"}
                  >
                    Stop Scanning
                  </Button>
                )}
              </div>

              <div className="text-xs sm:text-sm text-gray-500 px-2">
                Or drag and drop an image file here
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-8">
            <Alert className="mb-4 sm:mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">
                {error === 'Asset not found'
                  ? 'The QR code was scanned but no matching asset was found in the database.'
                  : error
                }
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-3 sm:space-y-4">
              <div className="text-4xl sm:text-6xl">📷</div>
              <p className="text-sm sm:text-base text-gray-600 px-2">
                {error === 'Asset not found'
                  ? 'Asset not found in database'
                  : 'Scan failed'
                }
              </p>
              <Button onClick={handleReset} className="w-full sm:w-auto" size={isMobile ? "lg" : "default"}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asset Found State */}
      {asset && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-8">
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="text-4xl sm:text-6xl">✅</div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-green-600 mb-2">Asset Found!</h2>
                <p className="text-sm sm:text-base text-gray-600 px-2">Asset details have been successfully retrieved</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 text-left">
                <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 pr-2">{asset.name}</h3>
                <div className="space-y-2 sm:space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <span className="text-gray-600">Asset No:</span>
                    <span className="font-medium text-right">{asset.noAsset}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      asset.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {asset.status}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium text-right">{asset.category?.name || '-'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium text-right">{asset.department?.name || '-'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <span className="text-gray-600">PIC:</span>
                    <span className="font-medium text-right">{asset.pic || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  onClick={handleSaveAsset}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  size={isMobile ? "lg" : "default"}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Record'
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto" size={isMobile ? "lg" : "default"}>
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
