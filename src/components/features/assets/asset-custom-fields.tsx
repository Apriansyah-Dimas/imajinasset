'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface CustomField {
  id: string
  name: string
  label: string
  fieldType: string
  required: boolean
  showCondition?: string
  options?: string
  defaultValue?: string
  description?: string
}

interface CustomValue {
  id: string
  customFieldId: string
  stringValue?: string
  numberValue?: number
  dateValue?: string
  booleanValue?: boolean
  customField: CustomField
}

interface AssetCustomFieldsProps {
  assetId: string
  assetStatus?: string
  customValues: CustomValue[]
  customFields: CustomField[]
  onChange: (customValues: any[]) => void
  disabled?: boolean
}

export default function AssetCustomFields({
  assetId,
  assetStatus,
  customValues,
  customFields,
  onChange,
  disabled = false
}: AssetCustomFieldsProps) {
  const [localValues, setLocalValues] = useState<Record<string, any>>({})

  useEffect(() => {
    // Initialize values from customValues prop
    const initialValues: Record<string, any> = {}
    customValues.forEach(value => {
      const fieldId = value.customFieldId
      const fieldType = value.customField.fieldType

      switch (fieldType) {
        case 'TEXT':
        case 'TEXTAREA':
        case 'SELECT':
          initialValues[fieldId] = value.stringValue || ''
          break
        case 'NUMBER':
          initialValues[fieldId] = value.numberValue || ''
          break
        case 'DATE':
          initialValues[fieldId] = value.dateValue ? new Date(value.dateValue) : null
          break
        case 'BOOLEAN':
          initialValues[fieldId] = value.booleanValue || false
          break
      }
    })
    setLocalValues(initialValues)
  }, [customValues])

  // Check if field should be shown based on condition
  const shouldShowField = (field: CustomField) => {
    if (!field.showCondition) return true

    try {
      // Simple condition parsing (e.g., "status=Sell")
      const [key, value] = field.showCondition.split('=')

      if (key === 'status') {
        return assetStatus === value
      }

      return true
    } catch (error) {
      console.error('Error parsing show condition:', error)
      return true // Show field if condition can't be parsed
    }
  }

  // Filter fields that should be shown
  const visibleFields = customFields.filter(shouldShowField)

  const handleFieldChange = (fieldId: string, value: any) => {
    const newValues = { ...localValues, [fieldId]: value }
    setLocalValues(newValues)

    // Convert to custom values format for parent
    const updatedCustomValues = visibleFields.map(field => {
      const fieldValue = newValues[field.id]
      const fieldType = field.fieldType

      const baseValue = {
        customFieldId: field.id,
        stringValue: undefined,
        numberValue: undefined,
        dateValue: undefined,
        booleanValue: undefined
      }

      switch (fieldType) {
        case 'TEXT':
        case 'TEXTAREA':
        case 'SELECT':
          return { ...baseValue, stringValue: fieldValue || '' }
        case 'NUMBER':
          return { ...baseValue, numberValue: fieldValue ? parseFloat(fieldValue) : undefined }
        case 'DATE':
          return { ...baseValue, dateValue: fieldValue ? fieldValue.toISOString() : undefined }
        case 'BOOLEAN':
          return { ...baseValue, booleanValue: fieldValue }
        default:
          return baseValue
      }
    })

    onChange(updatedCustomValues)
  }

  const renderField = (field: CustomField) => {
    const value = localValues[field.id]
    const isRequired = field.required

    switch (field.fieldType) {
      case 'TEXT':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.defaultValue || ''}
              disabled={disabled}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        )

      case 'NUMBER':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.defaultValue || ''}
              disabled={disabled}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        )

      case 'DATE':
        return (
          <div className="space-y-2">
            <Label>
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(value, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value}
                  onSelect={(date) => handleFieldChange(field.id, date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        )

      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              disabled={disabled}
            />
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        )

      case 'SELECT':
        const options = field.options ? field.options.split(',').map(opt => opt.trim()) : []
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        )

      case 'TEXTAREA':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.defaultValue || ''}
              disabled={disabled}
              rows={3}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (visibleFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold text-gray-900">Additional Information</h3>
      <div className="space-y-4">
        {visibleFields.map((field) => (
          <div key={field.id}>
            {renderField(field)}
          </div>
        ))}
      </div>
    </div>
  )
}