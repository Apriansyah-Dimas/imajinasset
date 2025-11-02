"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus } from "lucide-react"

interface AdditionalField {
  id: string
  name: string
  value: string
}

interface AdditionalInformationProps {
  fields: AdditionalField[]
  onChange: (fields: AdditionalField[]) => void
  readOnly?: boolean
  mode?: 'create' | 'edit' // create mode: can add/remove fields, edit mode: only edit values
}

export default function AdditionalInformation({
  fields,
  onChange,
  readOnly = false,
  mode = 'create'
}: AdditionalInformationProps) {
  const addField = () => {
    const newField: AdditionalField = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      value: ''
    }
    const updatedFields = [...fields, newField]
    onChange(updatedFields)
  }

  const updateField = (id: string, field: 'name' | 'value', value: string) => {
    const updatedFields = fields.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    )
    onChange(updatedFields)
  }

  const removeField = (id: string) => {
    const updatedFields = fields.filter(f => f.id !== id)
    onChange(updatedFields)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Additional Information</Label>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            className="text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Create Mode: Show empty fields and allow adding/removing */}
        {mode === 'create' && fields.length === 0 && !readOnly && (
          <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 text-sm">No additional information fields</p>
            <p className="text-gray-400 text-xs mt-1">Click "Add Field" to add custom information</p>
          </div>
        )}

        {/* Read-only mode with no fields */}
        {fields.length === 0 && readOnly && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No additional information</p>
          </div>
        )}

        {/* Create Mode: Show fields with name + value inputs */}
        {mode === 'create' && fields.map((field) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Field name (e.g., Price, Notes, Vendor)"
                value={field.name}
                onChange={(e) => updateField(field.id, 'name', e.target.value)}
                readOnly={readOnly}
                className="mb-2"
              />
              <Input
                type="text"
                placeholder="Field value"
                value={field.value}
                onChange={(e) => updateField(field.id, 'value', e.target.value)}
                readOnly={readOnly}
              />
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeField(field.id)}
                className="text-red-600 hover:text-red-700 mt-6"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {/* Edit Mode: Show existing fields with name labels and value inputs */}
        {mode === 'edit' && fields.filter(f => f.name.trim() !== '').map((field) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {field.name}
              </Label>
              {readOnly ? (
                <div
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm select-text cursor-text"
                  onMouseDown={(e) => {
                    // Allow text selection when clicked
                    e.currentTarget.focus()
                    if (e.currentTarget.textContent) {
                      const selection = window.getSelection()
                      const range = document.createRange()
                      range.selectNodeContents(e.currentTarget)
                      selection.removeAllRanges()
                      selection.addRange(range)
                    }
                  }}
                >
                  {field.value || <span className="text-gray-400">No value</span>}
                </div>
              ) : (
                <Input
                  type="text"
                  placeholder={`Enter ${field.name.toLowerCase()}`}
                  value={field.value}
                  onChange={(e) => updateField(field.id, 'value', e.target.value)}
                  readOnly={readOnly}
                />
              )}
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeField(field.id)}
                className="text-red-600 hover:text-red-700 mt-6"
                title="Delete this field"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {/* Edit Mode: Show new fields (with empty names) as full field inputs */}
        {mode === 'edit' && fields.filter(f => f.name.trim() === '').map((field) => (
          <div key={field.id} className="flex gap-2 items-start border-2 border-dashed border-blue-300 rounded-lg p-3 bg-blue-50">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter field name (e.g., New Field)"
                value={field.name}
                onChange={(e) => updateField(field.id, 'name', e.target.value)}
                readOnly={readOnly}
                className="mb-2"
              />
              <Input
                type="text"
                placeholder="Enter field value"
                value={field.value}
                onChange={(e) => updateField(field.id, 'value', e.target.value)}
                readOnly={readOnly}
              />
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeField(field.id)}
                className="text-red-600 hover:text-red-700 mt-6"
                title="Delete this new field"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {/* Edit Mode: Show message if no valid fields */}
        {mode === 'edit' && fields.filter(f => f.name.trim() !== '').length === 0 && !readOnly && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No additional information fields created yet</p>
            <p className="text-gray-400 text-xs mt-1">Create additional fields when adding new assets</p>
          </div>
        )}
      </div>
    </div>
  )
}