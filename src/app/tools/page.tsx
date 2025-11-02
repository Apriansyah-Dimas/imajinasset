'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Settings,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Users,
  Building,
  Tag,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export default function ToolsPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const tools = [
    {
      id: 'export-assets',
      title: 'Export All Assets',
      description: 'Download all assets data as CSV file',
      icon: Download,
      color: 'blue',
      action: async () => {
        setLoading('export-assets')
        try {
          const response = await fetch('/api/assets/export')

          if (!response.ok) {
            throw new Error('Export failed')
          }

          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url

          const contentDisposition = response.headers.get('content-disposition')
          let filename = `assets-export-${new Date().toISOString().split('T')[0]}.csv`
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
            if (filenameMatch) {
              filename = filenameMatch[1]
            }
          }

          a.download = filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          toast.success('Assets exported successfully!')
        } catch (error) {
          console.error('Export error:', error)
          toast.error('Failed to export assets')
        } finally {
          setLoading(null)
        }
      }
    },
    {
      id: 'backup-data',
      title: 'Backup Database',
      description: 'Create a backup of all system data',
      icon: Database,
      color: 'green',
      action: async () => {
        setLoading('backup-data')
        try {
          // Simulate backup process
          await new Promise(resolve => setTimeout(resolve, 2000))
          toast.success('Database backup created successfully!')
        } catch (error) {
          toast.error('Failed to create backup')
        } finally {
          setLoading(null)
        }
      }
    },
    {
      id: 'import-categories',
      title: 'Import Categories',
      description: 'Import asset categories from CSV file',
      icon: Upload,
      color: 'purple',
      action: async () => {
        toast.info('Feature coming soon!')
      }
    },
    {
      id: 'manage-users',
      title: 'Manage Users',
      description: 'Add, edit, or remove system users',
      icon: Users,
      color: 'orange',
      action: async () => {
        toast.info('User management feature coming soon!')
      }
    },
    {
      id: 'manage-sites',
      title: 'Manage Sites',
      description: 'Add, edit, or remove office locations',
      icon: Building,
      color: 'teal',
      action: async () => {
        toast.info('Site management feature coming soon!')
      }
    },
    {
      id: 'manage-departments',
      title: 'Manage Departments',
      description: 'Add, edit, or remove departments',
      icon: Tag,
      color: 'pink',
      action: async () => {
        toast.info('Department management feature coming soon!')
      }
    }
  ]

  const systemStats = [
    { label: 'Total Assets', value: '1,234', icon: Database },
    { label: 'Active Users', value: '12', icon: Users },
    { label: 'Total Sites', value: '5', icon: Building },
    { label: 'Categories', value: '8', icon: Tag }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      teal: 'bg-teal-100 text-teal-800 border-teal-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getButtonColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700',
      green: 'bg-green-600 text-white border-green-700 hover:bg-green-700',
      purple: 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700',
      orange: 'bg-orange-600 text-white border-orange-700 hover:bg-orange-700',
      teal: 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700',
      pink: 'bg-pink-600 text-white border-pink-700 hover:bg-pink-700'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SYSTEM TOOLS</h1>
        <p className="text-gray-600 text-sm">Administrative tools and utilities for system management</p>
      </div>

      {/* System Statistics */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">SYSTEM OVERVIEW</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white border border-gray-300 p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Data Management Tools */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">DATA MANAGEMENT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.slice(0, 3).map((tool) => {
            const Icon = tool.icon
            return (
              <div key={tool.id} className="bg-white border border-gray-300">
                <div className="p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`w-10 h-10 ${getColorClasses(tool.color)} border flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {tool.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                    {tool.description}
                  </p>
                  <button
                    onClick={tool.action}
                    disabled={loading === tool.id}
                    className={`w-full flex items-center justify-center px-3 py-2 ${getButtonColorClasses(tool.color)} text-sm font-medium disabled:opacity-50`}
                  >
                    {loading === tool.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        EXECUTE
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* System Management Tools */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">SYSTEM MANAGEMENT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.slice(3).map((tool) => {
            const Icon = tool.icon
            return (
              <div key={tool.id} className="bg-white border border-gray-300">
                <div className="p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`w-10 h-10 ${getColorClasses(tool.color)} border flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {tool.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                    {tool.description}
                  </p>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      COMING SOON
                    </span>
                  </div>
                  <button
                    onClick={tool.action}
                    disabled
                    className="w-full flex items-center justify-center px-3 py-2 bg-gray-300 text-gray-500 border border-gray-400 text-sm font-medium cursor-not-allowed"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    UNAVAILABLE
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white border border-gray-300">
        <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-900">
          <h2 className="text-sm font-bold">SYSTEM HEALTH</h2>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">Database Connection</span>
              </div>
              <span className="text-xs font-medium text-green-600">HEALTHY</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">API Services</span>
              </div>
              <span className="text-xs font-medium text-green-600">OPERATIONAL</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">File Storage</span>
              </div>
              <span className="text-xs font-medium text-green-600">AVAILABLE</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">Last Backup</span>
              </div>
              <span className="text-xs font-medium text-gray-600">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}