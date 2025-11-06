'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Database, Loader2, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DataSummary = {
  assets: number
  employees: number
  soSessions: number
  nonAdminUsers: number
  soAssetEntries: number
  assetCustomValues: number
  assetCustomFields: number
  logs: number
  backups: number
}

type CleanResponse = {
  success?: boolean
  cleanedAt?: string
  summary?: Record<string, number>
  engine?: string
  error?: string
}

const defaultSummary: DataSummary = {
  assets: 0,
  employees: 0,
  soSessions: 0,
  nonAdminUsers: 0,
  soAssetEntries: 0,
  assetCustomValues: 0,
  assetCustomFields: 0,
  logs: 0,
  backups: 0
}

type CleanDataSandboxPanelProps = {
  className?: string
}

export function CleanDataSandboxPanel({ className }: CleanDataSandboxPanelProps) {
  const [dataSummary, setDataSummary] = useState<DataSummary>(defaultSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<CleanResponse | null>(null)

  const fetchDataSummary = useCallback(async () => {
    if (typeof window === 'undefined') return

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        setError('Authentication token is missing. Please sign in again.')
        setDataSummary(defaultSummary)
        return
      }

      const response = await fetch('/api/admin/data-summary', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to fetch data summary.')
      }

      const payload: Partial<DataSummary> = await response.json()
      setDataSummary({
        ...defaultSummary,
        ...payload
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data summary.'
      console.error('[CleanDataSandbox] Failed to get data summary:', err)
      setError(message)
      setDataSummary(defaultSummary)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDataSummary()
  }, [fetchDataSummary])

  const handleCleanAllData = useCallback(async () => {
    setCleaning(true)
    setError(null)
    setCleanResult(null)

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token')
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
      }

      const response = await fetch('/api/backup/clean', {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to clean data.')
      }

      const payload: CleanResponse = await response.json()
      setCleanResult(payload)
      await fetchDataSummary()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clean data.'
      console.error('[CleanDataSandbox] Clean all data failed:', err)
      setError(message)
    } finally {
      setCleaning(false)
    }
  }, [fetchDataSummary])

  const cleanSummaryEntries = useMemo(() => {
    return Object.entries(cleanResult?.summary ?? {})
      .map(([key, count]) => [key, Number(count) || 0] as const)
      .filter(([, count]) => count > 0)
  }, [cleanResult])

  const cleanTotal = useMemo(() => {
    return cleanSummaryEntries.reduce((acc, [, count]) => acc + count, 0)
  }, [cleanSummaryEntries])

  const summaryItems = [
    {
      title: 'Assets',
      value: dataSummary.assets,
      subtext: 'Total aset di sandbox',
      iconClass: 'text-blue-600'
    },
    {
      title: 'Employees',
      value: dataSummary.employees,
      subtext: 'Total pegawai',
      iconClass: 'text-emerald-600'
    },
    {
      title: 'SO Sessions',
      value: dataSummary.soSessions,
      subtext: 'Total sesi stock opname',
      iconClass: 'text-purple-600'
    },
    {
      title: 'Non-Admin Users',
      value: dataSummary.nonAdminUsers,
      subtext: 'Akun user non-admin',
      iconClass: 'text-orange-600'
    }
  ]

  if (loading) {
    return (
      <div className={cn('mt-8 flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-sm text-gray-600', className)}>
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-600" />
        Loading clean data summary...
      </div>
    )
  }

  return (
    <div className={cn('mt-8 space-y-6', className)}>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Clean Data Sandbox</h2>
        <p className="text-sm text-gray-600">
          Bersihkan data testing di lingkungan sandbox. Lakukan export backup terlebih dahulu karena proses tidak dapat dibatalkan.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            value={item.value}
            subtext={item.subtext}
            icon={<Database className={`h-5 w-5 ${item.iconClass}`} />}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Bersihkan Data Sandbox
          </CardTitle>
          <CardDescription>
            Menghapus seluruh data operasional sandbox dan membuat ulang admin default untuk pengujian ulang.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Gunakan fitur ini hanya setelah Anda menyimpan backup terbaru. Semua data akan hilang permanen.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleCleanAllData}
              disabled={cleaning}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {cleaning ? 'Membersihkan data...' : 'Clean Data Sandbox'}
            </Button>
            {cleanResult?.cleanedAt && (
              <span className="text-xs text-gray-500">
                Terakhir dibersihkan: {new Date(cleanResult.cleanedAt).toLocaleString()}
              </span>
            )}
          </div>

          {cleanResult?.summary && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2 font-semibold text-green-900">
                <CheckCircle className="h-4 w-4" />
                Data cleaned successfully
              </div>
              <p className="mt-1 text-xs text-green-700">
                Total rows deleted: <span className="font-semibold">{cleanTotal}</span>
              </p>
              {cleanSummaryEntries.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {cleanSummaryEntries.map(([table, count]) => (
                    <div key={table} className="flex items-center justify-between uppercase tracking-wide">
                      <span className="mr-2 text-green-700">
                        {table.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-green-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type SummaryCardProps = {
  title: string
  value: number
  subtext: string
  icon: ReactNode
}

function SummaryCard({ title, value, subtext, icon }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-md bg-gray-100 p-2 text-gray-700">{icon}</div>
        <div>
          <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
          <CardDescription className="text-xs text-gray-500">{subtext}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  )
}

export default CleanDataSandboxPanel
