'use client'

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Download, Loader2, Upload, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type BackupManagerPanelProps = {
  className?: string
  title?: string
  description?: string
  hideMetadataPreview?: boolean
}

export function BackupManagerPanel({
  className,
  title = 'Full Backup Export & Restore',
  description = 'Satu klik backup & restore untuk data Assets, Employees, SO Sessions, serta User Management (database-only).',
  hideMetadataPreview = false
}: BackupManagerPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('Ready to export backup')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('Waiting for backup upload')
  const [importSummary, setImportSummary] = useState<{ total: number; tables: Record<string, number> } | null>(null)
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanStatus, setCleanStatus] = useState('Ready to clean data')
  const [cleanSummary, setCleanSummary] = useState<Record<string, number> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const resetExportFeedback = useCallback(() => {
    setExportProgress(0)
    setExportStatus('Ready to export backup')
  }, [])

  const resetImportFeedback = useCallback(() => {
    setImportProgress(0)
    setImportStatus('Waiting for backup upload')
    setImportSummary(null)
  }, [])

  const resetCleanFeedback = useCallback(() => {
    setCleanStatus('Ready to clean data')
  }, [])

  const extractFilename = useCallback((contentDisposition?: string | null) => {
    if (!contentDisposition) return null

    try {
      const encodedMatch = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(contentDisposition)
      if (encodedMatch?.[1]) {
        return decodeURIComponent(encodedMatch[1].replace(/"/g, '').trim())
      }

      const match = /filename="?([^";]+)"?/i.exec(contentDisposition)
      if (match?.[1]) {
        return match[1].trim()
      }
    } catch (error) {
      console.warn('Unable to parse filename from header:', error)
    }

    return null
  }, [])

  const handleExportBackup = useCallback(async () => {
    if (isExporting || typeof window === 'undefined') return

    setIsExporting(true)
    setImportSummary(null)
    setExportProgress(15)
    setExportStatus('Preparing backup...')

    try {
      const response = await fetch('/api/backup/export')

      if (!response.ok) {
        let message = 'Failed to export backup.'
        try {
          const errorPayload = await response.json()
          message = errorPayload?.error ?? message
        } catch {
          try {
            message = (await response.text()) || message
          } catch {
            // ignore parsing fallback errors
          }
        }
        throw new Error(message)
      }

      setExportProgress(55)
      setExportStatus('Collecting tables...')

      const blob = await response.blob()

      setExportProgress(85)
      setExportStatus('Generating download...')

      const filename =
        extractFilename(response.headers.get('Content-Disposition')) ??
        `assetso-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`

      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setExportProgress(100)
      setExportStatus('Download ready')
      toast.success('Backup export ready', { description: filename })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export backup.'
      console.error('Backup export failed:', error)
      setExportProgress(0)
      setExportStatus(message)
      toast.error('Backup export failed', { description: message })
    } finally {
      setIsExporting(false)
      setTimeout(resetExportFeedback, 4000)
    }
  }, [extractFilename, isExporting, resetExportFeedback])

  const handleImportButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0]
      if (!selectedFile) return

      setIsImporting(true)
      setImportSummary(null)
      setImportProgress(15)
      setImportStatus('Uploading backup...')

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const response = await fetch('/api/backup/import', {
          method: 'POST',
          body: formData
        })

        setImportProgress(55)
        setImportStatus('Processing backup...')

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          const message = payload?.error || 'Failed to import backup.'
          throw new Error(message)
        }

        setImportProgress(85)
        setImportStatus('Finalizing restore...')

        const importedTables = (payload?.importedTables ?? {}) as Record<string, number>
        const totalRestored = Object.values(importedTables).reduce(
          (sum, value) => sum + (typeof value === 'number' ? value : 0),
          0
        )

        setImportProgress(100)
        setImportStatus(`Success! Restored ${totalRestored} items`)
        setImportSummary({ total: totalRestored, tables: importedTables })

        toast.success('Backup import completed', {
          description: payload?.metadata?.name ?? selectedFile.name
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to import backup.'
        console.error('Backup import failed:', error)
        setImportProgress(0)
        setImportStatus(message)
        toast.error('Backup import failed', { description: message })
      } finally {
        setIsImporting(false)
        if (event.target) {
          event.target.value = ''
        }
        setTimeout(resetImportFeedback, 6000)
      }
    },
    [resetImportFeedback]
  )

  const handleCleanData = useCallback(async () => {
    if (isCleaning) return
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Tindakan ini akan menghapus seluruh data Assets, Employees, SO Sessions, Maintenance, dan User non-admin.\nPastikan Anda sudah melakukan backup terlebih dahulu.\nLanjutkan?'
      )
      if (!confirmed) return
    }

    setIsCleaning(true)
    setCleanStatus('Cleaning data...')
    setCleanSummary(null)

    try {
      const response = await fetch('/api/backup/clean', {
        method: 'POST'
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.success) {
        const message = payload?.error || 'Failed to clean data.'
        throw new Error(message)
      }

      const summary = (payload?.summary ?? {}) as Record<string, number>
      setCleanSummary(summary)
      setCleanStatus('Clean complete. Data tables kosong untuk pengujian restore.')
      toast.success('Data cleaned successfully', {
        description: 'Seluruh data non-admin telah dibersihkan.'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clean data.'
      console.error('Data clean failed:', error)
      setCleanStatus(message)
      toast.error('Data clean failed', { description: message })
    } finally {
      setIsCleaning(false)
      setTimeout(resetCleanFeedback, 6000)
    }
  }, [isCleaning, resetCleanFeedback])

  const importPreviewList = useMemo(() => {
    if (!importSummary) return null
    return Object.entries(importSummary.tables)
      .filter(([, count]) => typeof count === 'number')
      .slice(0, hideMetadataPreview ? 4 : 8)
  }, [importSummary, hideMetadataPreview])

  return (
    <div className={className}>
      <div className="bg-white border-2 border-gray-200 shadow-xl p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-blue-900">Export Backup</h3>
                    <p className="text-xs sm:text-sm text-blue-700/80">
                      Download zip berisi database.json dan metadata lengkap siap import.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportBackup}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold border-2 border-blue-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export Data'}
                  </Button>
                </div>
                <Progress value={exportProgress} />
                <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-800">
                  {exportProgress === 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <Download className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="font-medium">{exportStatus}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-emerald-900">Import Backup</h3>
                    <p className="text-xs sm:text-sm text-emerald-700/80">
                      Upload zip dari export untuk restore seluruh data database secara atomic.
                    </p>
                  </div>
                  <Button
                    onClick={handleImportButtonClick}
                    disabled={isImporting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-2 border-emerald-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
                  >
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isImporting ? 'Importing...' : 'Import Data'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleImportFileChange}
                  />
                </div>
                <Progress value={importProgress} />
                <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800">
                  {importProgress === 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  ) : importProgress === 0 && importStatus !== 'Waiting for backup upload' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Upload className="h-4 w-4 text-emerald-600" />
                  )}
                  <span className="font-medium">{importStatus}</span>
                </div>

                {importSummary && importPreviewList && importPreviewList.length > 0 && (
                  <div className="rounded-md border border-emerald-200 bg-white/90 p-3 text-xs sm:text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-semibold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{importSummary.total} items restored</span>
                    </div>
                    {!hideMetadataPreview && (
                      <p className="mt-1 text-xs text-emerald-700/80">
                        Detail per tabel berdasarkan metadata backup.
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {importPreviewList.map(([table, count]) => (
                        <div key={table} className="flex items-center justify-between uppercase tracking-wide">
                          <span className="mr-2 text-[11px] sm:text-xs text-emerald-700">{table.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-emerald-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-red-900">Clean Data Sandbox</h3>
                  <p className="text-xs sm:text-sm text-red-700/80">
                    Hapus seluruh data Assets, Employees, SO Sessions, Maintenance, dan Users non-admin untuk pengujian backup/restore.
                  </p>
                </div>
                <Button
                  onClick={handleCleanData}
                  disabled={isCleaning}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold border-2 border-red-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
                >
                  {isCleaning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {isCleaning ? 'Cleaning...' : 'Clean Data'}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-red-800">
                {isCleaning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                ) : cleanSummary ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">{cleanStatus}</span>
              </div>

              {cleanSummary && (
                <div className="rounded-md border border-red-200 bg-white/90 p-3 text-xs sm:text-sm text-red-800">
                  <div className="font-semibold text-red-900 mb-2">Rows deleted per table:</div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {Object.entries(cleanSummary).map(([table, count]) => (
                      <div key={table} className="flex items-center justify-between uppercase tracking-wide">
                        <span className="mr-2 text-[11px] sm:text-xs text-red-700">{table.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-semibold text-red-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BackupManagerPanel
