'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Plus, Search, Edit, Trash2, Eye, User, Package, Calendar, Mail, Building, Briefcase, Upload } from 'lucide-react'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ImportEmployeesModal from '@/components/import-employees-modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Employee {
  id: string
  employeeId: string
  name: string
  email?: string
  department?: string
  position?: string
  joinDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    assets: number
  }
}

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; name: string }>>([])

  // Form states
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    department: '',
    position: '',
    joinDate: '',
    isActive: true
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        // Get asset count for each employee
        const employeesWithCounts = await Promise.all(
          data.map(async (employee: Employee) => {
            try {
              const assetResponse = await fetch(`/api/assets?picId=${employee.id}`)
              if (assetResponse.ok) {
                const assetData = await assetResponse.json()
                return {
                  ...employee,
                  _count: {
                    assets: assetData.assets?.length || 0
                  }
                }
              }
              return { ...employee, _count: { assets: 0 } }
            } catch (error) {
              return { ...employee, _count: { assets: 0 } }
            }
          })
        )
        setEmployees(employeesWithCounts)
      }
    } catch (error) {
      toast.error('Failed to fetch employees')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = (employees || []).filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatEmployeeName = (name: string): ReactNode => {
    const words = name.trim().split(/\s+/)

    if (words.length <= 3) {
      return name
    }

    return (
      <>
        {words.slice(0, 3).join(' ')}
        <span className="block">{words.slice(3).join(' ')}</span>
      </>
    )
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      department: '',
      position: '',
      joinDate: today,
      isActive: true
    })
  }

  const handleAddEmployee = async () => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Employee added successfully')
        setShowAddModal(false)
        resetForm()
        fetchEmployees()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add employee')
      }
    } catch (error) {
      toast.error('Failed to add employee')
    }
  }

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Employee updated successfully')
        setShowEditModal(false)
        setSelectedEmployee(null)
        resetForm()
        fetchEmployees()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update employee')
      }
    } catch (error) {
      toast.error('Failed to update employee')
    }
  }

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Employee deleted successfully')
        setShowDeleteModal(false)
        setSelectedEmployee(null)
        fetchEmployees()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete employee')
      }
    } catch (error) {
      toast.error('Failed to delete employee')
    }
  }

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email || '',
      department: employee.department || '',
      position: employee.position || '',
      joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : new Date().toISOString().split('T')[0],
      isActive: employee.isActive
    })
    setShowEditModal(true)
  }

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/departments')
        if (response.ok) {
          const data = await response.json()
          setDepartmentOptions(Array.isArray(data) ? data : [])
        } else {
          setDepartmentOptions([])
        }
      } catch (error) {
        setDepartmentOptions([])
      }
    }

    fetchDepartments()
  }, [])

  const totalAssets = employees.reduce((sum, employee) => sum + (employee._count?.assets || 0), 0)
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="p-3 sm:p-4 bg-gray-50 min-h-screen w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  ← Back
                </Button>
              </Link>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  EMPLOYEE MANAGEMENT
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Manage employees and their asset assignments
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Total Employees</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Total Assets</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalAssets}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white border border-gray-200 rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Employees List */}
        {filteredEmployees.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow px-4 py-10 text-center text-gray-500 text-sm">
            <div className="flex flex-col items-center">
              <User className="h-10 w-10 mb-3 opacity-50" />
              No employees found
            </div>
          </div>
        ) : (
          <>
            <div className="hidden sm:block bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Information
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Contact
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Department/Position
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Assets
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            </div>
                            <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 whitespace-normal break-words leading-tight">
                                {formatEmployeeName(employee.name)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">ID: {employee.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden lg:table-cell">
                          <div className="text-sm">
                            {employee.email && (
                              <div className="flex items-center text-gray-900 truncate">
                                <Mail className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{employee.email}</span>
                              </div>
                            )}
                            {employee.joinDate && (
                              <div className="flex items-center text-gray-500">
                                <Calendar className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                                {new Date(employee.joinDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                          <div className="text-sm">
                            {employee.department && (
                              <div className="flex items-center text-gray-900 truncate">
                                <Building className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{employee.department}</span>
                              </div>
                            )}
                            {employee.position && (
                              <div className="flex items-center text-gray-500">
                                <Briefcase className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                                {employee.position}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden sm:table-cell">
                          <div className="text-sm text-gray-900 font-medium">
                            {employee._count?.assets || 0}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee)
                                setShowDetailsModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              aria-label={`View details for ${employee.name}`}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(employee)}
                              className="text-green-600 hover:text-green-900 p-1"
                              aria-label={`Edit ${employee.name}`}
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee)
                                setShowDeleteModal(true)
                              }}
                              className="text-red-600 hover:text-red-900 p-1"
                              aria-label={`Delete ${employee.name}`}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:hidden">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-white border border-gray-200 rounded-lg shadow p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 leading-tight break-words">
                          {formatEmployeeName(employee.name)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">ID: {employee.employeeId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee)
                          setShowDetailsModal(true)
                        }}
                        aria-label={`View details for ${employee.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(employee)}
                        aria-label={`Edit ${employee.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-green-600 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee)
                          setShowDeleteModal(true)
                        }}
                        aria-label={`Delete ${employee.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                    {employee.department && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="break-words">{employee.department}</span>
                      </div>
                    )}
                    {employee.position && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="break-words">{employee.position}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="break-words">{employee.email}</span>
                      </div>
                    )}
                    {employee.joinDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(employee.joinDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>Assets: {employee._count?.assets || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Employee</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="e.g., EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <Select
                    value={formData.department ? formData.department : 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value === 'none' ? '' : value })
                    }
                    disabled={departmentOptions.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={departmentOptions.length === 0 ? 'No departments available' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {departmentOptions.map((department) => (
                        <SelectItem key={department.id} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {departmentOptions.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Add departments first via the Assets settings.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="e.g., Manager, Developer"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEmployee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Employee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Employee</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="e.g., EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <Select
                    value={formData.department ? formData.department : 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value === 'none' ? '' : value })
                    }
                    disabled={departmentOptions.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={departmentOptions.length === 0 ? 'No departments available' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {departmentOptions.map((department) => (
                        <SelectItem key={department.id} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {departmentOptions.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Add departments first via the Assets settings.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="e.g., Manager, Developer"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedEmployee(null)
                    resetForm()
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditEmployee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Update Employee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedEmployee && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Employee</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete employee "{selectedEmployee.name}"? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedEmployee(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee Details Modal */}
        {showDetailsModal && selectedEmployee && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Employee Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Employee ID</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Join Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedEmployee.joinDate ? new Date(selectedEmployee.joinDate).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Department</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.department || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Position</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.position || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Total Assets</label>
                  <p className="text-sm text-gray-900">{selectedEmployee._count?.assets || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedEmployee.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-sm text-gray-900">{new Date(selectedEmployee.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedEmployee(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Employees Modal */}
        <ImportEmployeesModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onSuccess={fetchEmployees}
        />
      </div>
    </ProtectedRoute>
  )
}
