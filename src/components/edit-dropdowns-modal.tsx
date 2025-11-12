'use client'

import { useEffect, useState, type Dispatch, type SetStateAction, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'

interface EditDropdownsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MasterDataItem {
  id: string
  name: string
  sortOrder?: number | null
}

interface PicItem {
  id: string
  name: string
  employeeId?: string | null
}

type Entity = 'sites' | 'categories' | 'departments'

const getDraggableStyle = (style?: CSSProperties): CSSProperties => ({
  ...style,
  touchAction: 'none',
})

export default function EditDropdownsModal({ open, onOpenChange }: EditDropdownsModalProps) {
  const [sites, setSites] = useState<MasterDataItem[]>([])
  const [categories, setCategories] = useState<MasterDataItem[]>([])
  const [departments, setDepartments] = useState<MasterDataItem[]>([])
  const [pics, setPics] = useState<PicItem[]>([])
  const [loading, setLoading] = useState(false)

  const [newSite, setNewSite] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newPic, setNewPic] = useState('')

  useEffect(() => {
    if (open) {
      fetchMasterData()
    }
  }, [open])

  const sortByOrder = (items: MasterDataItem[]) => {
    return [...items].sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER
      return orderA - orderB || a.name.localeCompare(b.name)
    })
  }

  const fetchMasterData = async () => {
    try {
      const [sitesRes, categoriesRes, departmentsRes, picsRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/categories'),
        fetch('/api/departments'),
        fetch('/api/pics')
      ])

      // Handle each response separately to prevent one failure from affecting others
      if (sitesRes.ok) {
        const sitesData = await sitesRes.json()
        setSites(Array.isArray(sitesData) ? sortByOrder(sitesData) : [])
      } else {
        setSites([])
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(Array.isArray(categoriesData) ? sortByOrder(categoriesData) : [])
      } else {
        setCategories([])
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json()
        setDepartments(Array.isArray(departmentsData) ? sortByOrder(departmentsData) : [])
      } else {
        setDepartments([])
      }

      if (picsRes.ok) {
        const picsData = await picsRes.json()
        setPics(
          Array.isArray(picsData)
            ? picsData
                .map((pic: any) => ({
                  id: pic.id,
                  name: pic.name,
                  employeeId: pic.employeeId ?? null,
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : []
        )
      } else {
        setPics([])
      }

    } catch (error) {
      // Set all to empty arrays on any error
      setSites([])
      setCategories([])
      setDepartments([])
      setPics([])
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
        setSites(prev => sortByOrder([...prev, site]))
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

  const addPic = async () => {
    if (!newPic.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/pics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newPic.trim() }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to add PIC')
      }

      const pic = await response.json()
      setPics(prev =>
        [...prev, pic].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewPic('')
      toast.success('PIC added successfully')
    } catch (error) {
      console.error('Failed to add PIC:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add PIC')
    } finally {
      setLoading(false)
    }
  }

  const deletePic = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/pics/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete PIC')
      }

      setPics(prev => prev.filter(pic => pic.id !== id))
      toast.success('PIC deleted successfully')
    } catch (error) {
      console.error('Failed to delete PIC:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete PIC')
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
        setCategories(prev => sortByOrder([...prev, category]))
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
        setDepartments(prev => sortByOrder([...prev, department]))
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

  const reorderItems = (list: MasterDataItem[], startIndex: number, endIndex: number) => {
    const updated = Array.from(list)
    const [moved] = updated.splice(startIndex, 1)
    updated.splice(endIndex, 0, moved)
    return updated
  }

  const persistOrder = async (
    entity: Entity,
    orderedItems: MasterDataItem[],
    revert: () => void
  ) => {
    try {
      const response = await fetch(`/api/${entity}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: orderedItems.map(item => item.id) }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to reorder')
      }

      toast.success('Urutan berhasil diperbarui')
    } catch (error) {
      console.error('Failed to persist order:', error)
      revert()
      toast.error(error instanceof Error ? error.message : 'Failed to reorder')
    }
  }

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    if (source.droppableId !== destination.droppableId) return
    if (source.index === destination.index) return

    const entity = source.droppableId as Entity
    let updated: MasterDataItem[] = []
    let previous: MasterDataItem[] = []

    const applyReorder = (
      setter: Dispatch<SetStateAction<MasterDataItem[]>>
    ) => {
      setter(prev => {
        previous = [...prev]
        updated = reorderItems(prev, source.index, destination.index)
        return updated
      })
    }

    if (entity === 'sites') {
      applyReorder(setSites)
    } else if (entity === 'categories') {
      applyReorder(setCategories)
    } else {
      applyReorder(setDepartments)
    }

    void persistOrder(entity, updated, () => {
      if (entity === 'sites') {
        setSites(previous)
      } else if (entity === 'categories') {
        setCategories(previous)
      } else {
        setDepartments(previous)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-semibold">Manage Master Data</DialogTitle>
        </DialogHeader>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Tabs defaultValue="sites" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="pics">PIC</TabsTrigger>
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
              <CardHeader className="bg-gray-50 space-y-1">
                <CardTitle className="text-base">Existing Sites</CardTitle>
                <p className="text-xs text-gray-500">Tekan dan tarik kartu untuk mengubah urutan.</p>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="sites">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 max-h-64 overflow-y-auto"
                    >
                      {sites.map((site, index) => (
                        <Draggable
                          key={site.id}
                          draggableId={site.id}
                          index={index}
                          isDragDisabled={loading}
                        >
                          {(dragProvided, snapshot) => (
                            (() => {
                              const card = (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={getDraggableStyle(dragProvided.draggableProps.style)}
                                  className={`flex items-center justify-between gap-3 p-3 bg-white border rounded-lg transition-colors ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-gray-300" />
                                    <span className="w-6 text-center text-xs font-semibold text-gray-400">
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900">{site.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteSite(site.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      aria-label="Delete site"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )

                              return snapshot.isDragging && typeof document !== 'undefined'
                                ? createPortal(card, document.body)
                                : card
                            })()
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
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
              <CardHeader className="bg-gray-50 space-y-1">
                <CardTitle className="text-base">Existing Categories</CardTitle>
                <p className="text-xs text-gray-500">Seret kategori untuk menyusun prioritas tampilan.</p>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="categories">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 max-h-64 overflow-y-auto"
                    >
                      {categories.map((category, index) => (
                        <Draggable
                          key={category.id}
                          draggableId={category.id}
                          index={index}
                          isDragDisabled={loading}
                        >
                          {(dragProvided, snapshot) => (
                            (() => {
                              const card = (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={getDraggableStyle(dragProvided.draggableProps.style)}
                                  className={`flex items-center justify-between gap-3 p-3 bg-white border rounded-lg transition-colors ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-gray-300" />
                                    <span className="w-6 text-center text-xs font-semibold text-gray-400">
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900">{category.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteCategory(category.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      aria-label="Delete category"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )

                              return snapshot.isDragging && typeof document !== 'undefined'
                                ? createPortal(card, document.body)
                                : card
                            })()
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
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
              <CardHeader className="bg-gray-50 space-y-1">
                <CardTitle className="text-base">Existing Departments</CardTitle>
                <p className="text-xs text-gray-500">Drag & drop untuk menyusun struktur departemen.</p>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="departments">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 max-h-64 overflow-y-auto"
                    >
                      {departments.map((department, index) => (
                        <Draggable
                          key={department.id}
                          draggableId={department.id}
                          index={index}
                          isDragDisabled={loading}
                        >
                          {(dragProvided, snapshot) => (
                            (() => {
                              const card = (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={getDraggableStyle(dragProvided.draggableProps.style)}
                                  className={`flex items-center justify-between gap-3 p-3 bg-white border rounded-lg transition-colors ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-gray-300" />
                                    <span className="w-6 text-center text-xs font-semibold text-gray-400">
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900">{department.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteDepartment(department.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      aria-label="Delete department"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )

                              return snapshot.isDragging && typeof document !== 'undefined'
                                ? createPortal(card, document.body)
                                : card
                            })()
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pics" className="space-y-6 mt-6">
            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Add New PIC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    placeholder="Enter PIC name"
                    value={newPic}
                    onChange={(e) => setNewPic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPic()}
                    className="flex-1"
                  />
                  <Button onClick={addPic} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-gray-50 space-y-1">
                <CardTitle className="text-base">Existing PIC</CardTitle>
                <p className="text-xs text-gray-500">Gunakan daftar ini untuk menambah atau menghapus PIC tanpa membuka halaman lain.</p>
              </CardHeader>
              <CardContent>
                {pics.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    Belum ada PIC terdaftar.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pics.map((pic) => (
                      <div key={pic.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                        <div>
                          <p className="font-medium text-gray-900">{pic.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePic(pic.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Delete ${pic.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          </Tabs>
        </DragDropContext>
      </DialogContent>
    </Dialog>
  )
}
