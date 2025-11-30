"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { Package } from "lucide-react"

interface DashboardData {
  totalAssets: number
  totalCostByCategory: Array<{ name: string; value: number; cost: number }>
  assetsBySite: Array<{ name: string; value: number }>
  assetsByCategory: Array<{ name: string; value: number }>
  assetsByDepartment: Array<{ name: string; value: number }>
}

const DashboardCharts = dynamic(() => import("./dashboard-charts"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
})

const FALLBACK_DATA: DashboardData = {
  totalAssets: 0,
  totalCostByCategory: [],
  assetsBySite: [],
  assetsByCategory: [],
  assetsByDepartment: [],
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), [])
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }),
    []
  )

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard", {
          signal: controller.signal,
        })
        if (response.ok) {
          const dashboardData = (await response.json()) as DashboardData
          if (isMounted) {
            setData(dashboardData)
          }
        } else if (isMounted) {
          setData(FALLBACK_DATA)
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch dashboard data:", error)
          if (isMounted) {
            setData(FALLBACK_DATA)
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboardData()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  const totalValue = useMemo(
    () =>
      data?.totalCostByCategory?.reduce((sum, item) => sum + item.cost, 0) ||
      0,
    [data?.totalCostByCategory]
  )

  const formatCurrency = (value: number) => currencyFormatter.format(value)
  const formatNumber = (value: number) => numberFormatter.format(value)

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 lg:p-12">
        <div className="mb-6">
          <div className="h-8 bg-muted w-48 rounded animate-pulse"></div>
          <div className="h-4 bg-muted w-64 rounded animate-pulse mt-2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 lg:p-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">DASHBOARD</h1>
          <p className="text-gray-600 text-sm">
            Overview of asset management system
          </p>
        </div>
        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-6">
          <p className="text-red-700 font-bold text-center">
            ERROR: Failed to load dashboard data
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50 lg:p-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
          <Package className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">DASHBOARD</h1>
          <p className="text-gray-600 text-sm">
            Enterprise Asset Management System
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Total Assets
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {formatNumber(data.totalAssets)}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Value of Assets
              </div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(totalValue)}
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center rounded-lg">
              <span className="text-green-600 font-bold text-lg">Rp</span>
            </div>
          </div>
        </div>
      </div>

      <DashboardCharts
        assetsByDepartment={data.assetsByDepartment}
        assetsBySite={data.assetsBySite}
        assetsByCategory={data.assetsByCategory}
      />
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-5 w-48 bg-muted rounded mb-4 animate-pulse" />
        <div className="h-[300px] w-full bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="space-y-6">
        {[1, 2].map((key) => (
          <div
            key={key}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="h-5 w-40 bg-muted rounded mb-4 animate-pulse" />
            <div className="h-[135px] w-full bg-muted rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
