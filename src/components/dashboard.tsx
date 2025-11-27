'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Package } from 'lucide-react'

interface DashboardData {
  totalAssets: number
  totalCostByCategory: Array<{ name: string; value: number; cost: number }>
  assetsBySite: Array<{ name: string; value: number }>
  assetsByCategory: Array<{ name: string; value: number }>
  assetsByDepartment: Array<{ name: string; value: number }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#06B6D4']

// Custom tooltip component to show actual values instead of percentages
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-blue-600">Value: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

// Custom legend component for two-column layout
const CustomLegend = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  const halfLength = Math.ceil(data.length / 2)
  const leftColumn = data.slice(0, halfLength)
  const rightColumn = data.slice(halfLength)

  return (
    <div className="flex justify-center gap-8 mt-4">
      <div className="space-y-2">
        {leftColumn.map((entry, index) => (
          <div key={`legend-left-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-gray-700">{entry.name}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {rightColumn.map((entry, index) => (
          <div key={`legend-right-${index + halfLength}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS[(index + halfLength) % COLORS.length] }}
            />
            <span className="text-gray-700">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Use absolute URL to avoid CORS issues when accessed through Cloudflare tunnel
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/dashboard`)
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      } else {
        // Use fallback data if API fails
        const fallbackData: DashboardData = {
          totalAssets: 0,
          totalCostByCategory: [],
          assetsBySite: [],
          assetsByCategory: [],
          assetsByDepartment: []
        }
        setData(fallbackData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Use fallback data on error
      const fallbackData: DashboardData = {
        totalAssets: 0,
        totalCostByCategory: []
      }
      setData(fallbackData)
    } finally {
      setLoading(false)
    }
  }

  // Calculate total value from all categories
  const totalValue = data?.totalCostByCategory?.reduce((sum, item) => sum + item.cost, 0) || 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

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
          <p className="text-gray-600 text-sm">Overview of asset management system</p>
        </div>
        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-6">
          <p className="text-red-700 font-bold text-center">ERROR: Failed to load dashboard data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50 lg:p-12">
      {/* Page Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
          <Package className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">DASHBOARD</h1>
          <p className="text-gray-600 text-sm">Enterprise Asset Management System</p>
        </div>
      </div>

      {/* KPI Cards - Only 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total Assets Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Assets</div>
              <div className="text-3xl font-bold text-blue-600">{formatNumber(data?.totalAssets || 0)}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Value Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Value of Assets</div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center rounded-lg">
              <span className="text-green-600 font-bold text-lg">Rp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Large Pie Chart - By Department */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2c54' }}>Assets by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.assetsByDepartment}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
              >
                {data.assetsByDepartment.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend data={data.assetsByDepartment} />
        </div>

        {/* Right Column - Two Smaller Charts */}
        <div className="space-y-6">
          {/* Pie Chart - By Site */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2c54' }}>Assets by Site</h3>
            <ResponsiveContainer width="100%" height={135}>
              <PieChart>
                <Pie
                  data={data.assetsBySite}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={50}
                  innerRadius={20}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.assetsBySite.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <CustomLegend data={data.assetsBySite} />
          </div>

          {/* Pie Chart - By Category */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2c54' }}>Assets by Category</h3>
            <ResponsiveContainer width="100%" height={135}>
              <PieChart>
                <Pie
                  data={data.assetsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={50}
                  innerRadius={20}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.assetsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <CustomLegend data={data.assetsByCategory} />
          </div>
        </div>
      </div>

    </div>
  )
}
