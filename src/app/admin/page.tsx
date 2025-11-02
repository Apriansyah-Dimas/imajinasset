'use client'

import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Users, Settings, Shield, CheckCircle, Calendar, User, Database } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const adminTools = [
    {
      id: 'manage-users',
      title: 'User Management',
      description: 'Manage system users, roles, and permissions',
      icon: Users,
      color: 'blue',
      href: '/admin/users'
    },
    {
      id: 'manage-sessions',
      title: 'SO Asset Management',
      description: 'Manage SO sessions, force complete/cancel',
      icon: Calendar,
      color: 'green',
      href: '/admin/sessions'
    },
    {
      id: 'manage-employees',
      title: 'Employee Management',
      description: 'Manage employee information and PIC assignments',
      icon: User,
      color: 'indigo',
      href: '/admin/employees'
    },
    {
      id: 'backup-restore',
      title: 'Backup & Restore',
      description: 'Single-click export/import database dan uploads',
      icon: Database,
      color: 'orange',
      href: '/admin/backup'
    }
  ]

  
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      teal: 'bg-teal-100 text-teal-800 border-teal-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
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
      red: 'bg-red-600 text-white border-red-700 hover:bg-red-700',
      indigo: 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700',
      pink: 'bg-pink-600 text-white border-pink-700 hover:bg-pink-700'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <ProtectedRoute>
      <div className="p-3 sm:p-4 bg-gray-50 min-h-screen w-full overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">ADMIN PANEL</h1>
              <p className="text-xs sm:text-sm text-gray-600">System administration</p>
            </div>
          </div>
        </div>


        {/* Administrative Tools */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">ADMINISTRATIVE TOOLS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {adminTools.map((tool) => {
              const Icon = tool.icon
              return (
                <div key={tool.id} className="bg-white border border-gray-300">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 ${getColorClasses(tool.color)} border flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          {tool.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-3 sm:mb-4 line-clamp-2">
                      {tool.description}
                    </p>
                    <Link href={tool.href}>
                      <Button className={`w-full ${getButtonColorClasses(tool.color)} text-xs sm:text-sm`}>
                        <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        MANAGE
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white border border-gray-300">
          <div className="bg-gray-900 text-white px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-950">
            <h2 className="text-xs sm:text-sm font-bold">SYSTEM STATUS</h2>
          </div>
          <div className="p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <span className="text-xs sm:text-sm text-gray-700">Database</span>
                </div>
                <span className="text-xs font-medium text-green-600">HEALTHY</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <span className="text-xs sm:text-sm text-gray-700">API Services</span>
                </div>
                <span className="text-xs font-medium text-green-600">OPERATIONAL</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <span className="text-xs sm:text-sm text-gray-700">Authentication</span>
                </div>
                <span className="text-xs font-medium text-green-600">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
