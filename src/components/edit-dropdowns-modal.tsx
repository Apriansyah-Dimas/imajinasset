'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface EditDropdownsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MasterDataItem {
  id: string
  name: string
}

export default function EditDropdownsModal({ open, onOpenChange }: EditDropdownsModalProps) {
  const [sites, setSites] = useState<MasterDataItem[]>([])
  const [categories, setCategories] = useState<MasterDataItem[]>([])
  const [departments, setDepartments] = useState<MasterDataItem[]>([])
  const [loading, setLoading] = useState(false)

  const [newSite, setNewSite] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDepartment, setNewDepartment] = useState('')

  useEffect(() => {
    if (open) {
      fetchMasterData()
    }
  }, [open])

  const fetchMasterData = async () => {
    try {
      const [sitesRes, categoriesRes, departmentsRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/categories'),
        fetch('/api/departments')
      ])

      // Handle each response separately to prevent one failure from affecting others
      if (sitesRes.ok) {
        const sitesData = await sitesRes.json()
        setSites(Array.isArray(sitesData) ? sitesData : [])
      } else {
        setSites([])
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      } else {
        setCategories([])
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json()
        setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
      } else {
        setDepartments([])
      }

    } catch (error) {
      // Set all to empty arrays on any error
      setSites([])
      setCategories([])
      setDepartments([])
    }
  }

  const addSite = async () => {
    if (!newSite.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newSite.trim() }),
      })

      if (response.ok) {
        const site = await response.json()
        setSites([...sites, site])
        setNewSite('')
        toast.success('Site added successfully')
      } else {
        toast.error('Failed to add site')
      }
    } catch (error) {
      console.error('Failed to add site:', error)
      toast.error('Failed to add site')
    } finally {
      setLoading(false)
    }
  }

  const deleteSite = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSites(sites.filter(site => site.id !== id))
        toast.success('Site deleted successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete site')
      }
    } catch (error) {
      console.error('Failed to delete site:', error)
      toast.error('Failed to delete site')
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      })

      if (response.ok) {
        const category = await response.json()
        setCategories([...categories, category])
        setNewCategory('')
        toast.success('Category added successfully')
      } else {
        toast.error('Failed to add category')
      }
    } catch (error) {
      console.error('Failed to add category:', error)
      toast.error('Failed to add category')
    } finally {
      setLoading(false)
    }
  }

  const deleteCategory = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCategories(categories.filter(category => category.id !== id))
        toast.success('Category deleted successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('Failed to delete category')
    } finally {
      setLoading(false)
    }
  }

  const addDepartment = async () => {
    if (!newDepartment.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newDepartment.trim() }),
      })

      if (response.ok) {
        const department = await response.json()
        setDepartments([...departments, department])
        setNewDepartment('')
        toast.success('Department added successfully')
      } else {
        toast.error('Failed to add department')
      }
    } catch (error) {
      console.error('Failed to add department:', error)
      toast.error('Failed to add department')
    } finally {
      setLoading(false)
    }
  }

  const deleteDepartment = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDepartments(departments.filter(department => department.id !== id))
        toast.success('Department deleted successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete department')
      }
    } catch (error) {
      console.error('Failed to delete department:', error)
      toast.error('Failed to delete department')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-semibold">Manage Master Data</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="sites" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sites" className="space-y-6 mt-6">
            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Add New Site</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter site name"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSite()}
                  />
                  <Button onClick={addSite} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Existing Sites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between p-3 bg-white border hover:bg-gray-50 rounded-lg transition-colors">
                      <span className="font-medium text-gray-900">{site.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSite(site.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-6 mt-6">
            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Add New Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <Button onClick={addCategory} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Existing Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 bg-white border hover:bg-gray-50 rounded-lg transition-colors">
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(category.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="departments" className="space-y-6 mt-6">
            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Add New Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter department name"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                  />
                  <Button onClick={addDepartment} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Existing Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {departments.map((department) => (
                    <div key={department.id} className="flex items-center justify-between p-3 bg-white border hover:bg-gray-50 rounded-lg transition-colors">
                      <span className="font-medium text-gray-900">{department.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDepartment(department.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
