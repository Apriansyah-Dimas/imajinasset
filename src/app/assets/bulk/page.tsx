'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function BulkAssetPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setUploadedFile(file)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/assets/bulk', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          message: `Successfully uploaded ${result.successful} assets`,
          details: result
        })
        toast.success('Assets uploaded successfully!')
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Upload failed',
          details: result
        })
        toast.error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({
        success: false,
        message: 'Upload failed due to server error'
      })
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/assets/template')

      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'asset-template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Template downloaded successfully!')
    } catch (error) {
      console.error('Template download error:', error)
      toast.error('Failed to download template')
    }
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">BULK ASSET UPLOAD</h1>
        <p className="text-gray-600 text-sm">Upload multiple assets at once using a CSV file</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Instructions */}
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
            <h2 className="text-sm font-bold">INSTRUCTIONS</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-800">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    <strong>Download the template</strong> to see the required format for your CSV file.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-800">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    <strong>Fill in your asset data</strong> following the template structure. Required fields are marked with *.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-800">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    <strong>Upload your CSV file</strong> using the upload area below.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Download Template */}
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
            <h2 className="text-sm font-bold">STEP 1: DOWNLOAD TEMPLATE</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Asset Template CSV</p>
                  <p className="text-xs text-gray-500">Pre-formatted template for bulk asset upload</p>
                </div>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white border border-green-700 hover:bg-green-700 text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                DOWNLOAD
              </button>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
            <h2 className="text-sm font-bold">STEP 2: UPLOAD CSV FILE</h2>
          </div>
          <div className="p-4">
            {!uploadedFile ? (
              <div
                className={`border-2 border-dashed ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} p-8 text-center`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your CSV file here, or
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 text-sm font-medium"
                >
                  BROWSE FILES
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Only CSV files are supported
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-gray-300 p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetUpload}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      REMOVE
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
                  >
                    CHOOSE DIFFERENT FILE
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        UPLOADING...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        UPLOAD ASSETS
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
              <div className={`mt-4 p-4 border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start space-x-3">
                  {uploadResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {uploadResult.message}
                    </p>
                    {uploadResult.details && (
                      <div className="mt-2">
                        {uploadResult.success ? (
                          <div className="text-xs text-green-700">
                            <p>• {uploadResult.details.successful} assets successfully added</p>
                            {uploadResult.details.errors > 0 && (
                              <p>• {uploadResult.details.errors} assets had errors</p>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-red-700">
                            {uploadResult.details.errors && (
                              <p>• {uploadResult.details.errors}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Format Requirements */}
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
            <h2 className="text-sm font-bold">CSV FORMAT REQUIREMENTS</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Required Fields:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• name - Asset name *</li>
                  <li>• noAsset - Asset number *</li>
                  <li>• categoryId - Category ID *</li>
                  <li>• siteId - Site ID *</li>
                  <li>• departmentId - Department ID *</li>
                  <li>• status - Status *</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Optional Fields:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• serialNo - Serial number</li>
                  <li>• brand - Brand name</li>
                  <li>• model - Model number</li>
                  <li>• pic - Person in charge</li>
                  <li>• purchaseDate - YYYY-MM-DD format</li>
                  <li>• cost - Numeric value</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}