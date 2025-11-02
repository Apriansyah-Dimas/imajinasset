'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BulkAddModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ParsedAsset {
  name: string
  noAsset: string
  status: string
  serialNo: string
  purchaseDate: string
  cost: string
  brand: string
  model: string
  site: string
  category: string
  department: string
  pic: string
  line: number
  isValid: boolean
  error?: string
}

export default function BulkAddModal({ open, onOpenChange, onSuccess }: BulkAddModalProps) {
  const [inputText, setInputText] = useState('')
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResults, setSubmitResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const parseInput = (text: string): ParsedAsset[] => {
    const lines = text.split('\n')
    const assets: ParsedAsset[] = []

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) {
        return
      }

      // Split by comma - need exactly 12 fields
      const parts = trimmedLine.split(',')
      
      if (parts.length < 12) {
        // Not enough fields - invalid format
        assets.push({
          name: trimmedLine,
          noAsset: '',
          status: '',
          serialNo: '',
          purchaseDate: '',
          cost: '',
          brand: '',
          model: '',
          site: '',
          category: '',
          department: '',
          pic: '',
          line: index + 1,
          isValid: false,
          error: `Need 12 fields, got ${parts.length}. Format: NameOfAsset,NoAsset,Status,SerialNo,PurchaseDate,Cost,Brand,Model,Site,Category,Department,PIC. Use "?" for empty fields.`
        })
        return
      }

      // Handle names with commas - take everything before the 11th comma as name
      const name = parts.slice(0, parts.length - 11).join(',').trim()
      const noAsset = parts[parts.length - 11].trim()
      const status = parts[parts.length - 10].trim()
      const serialNo = parts[parts.length - 9].trim()
      const purchaseDate = parts[parts.length - 8].trim()
      const cost = parts[parts.length - 7].trim()
      const brand = parts[parts.length - 6].trim()
      const model = parts[parts.length - 5].trim()
      const site = parts[parts.length - 4].trim()
      const category = parts[parts.length - 3].trim()
      const department = parts[parts.length - 2].trim()
      const pic = parts[parts.length - 1].trim()

      // Convert "?" to empty string for optional fields
      const cleanStatus = status === "?" ? "" : status
      const cleanSerialNo = serialNo === "?" ? "" : serialNo
      const cleanPurchaseDate = purchaseDate === "?" ? "" : purchaseDate
      const cleanCost = cost === "?" ? "" : cost
      const cleanBrand = brand === "?" ? "" : brand
      const cleanModel = model === "?" ? "" : model
      const cleanSite = site === "?" ? "" : site
      const cleanCategory = category === "?" ? "" : category
      const cleanDepartment = department === "?" ? "" : department
      const cleanPic = pic === "?" ? "" : pic

      if (!name) {
        assets.push({
          name: '',
          noAsset,
          status: cleanStatus,
          serialNo: cleanSerialNo,
          purchaseDate: cleanPurchaseDate,
          cost: cleanCost,
          brand: cleanBrand,
          model: cleanModel,
          site: cleanSite,
          category: cleanCategory,
          department: cleanDepartment,
          pic: cleanPic,
          line: index + 1,
          isValid: false,
          error: 'Asset name is empty'
        })
        return
      }

      if (!noAsset) {
        assets.push({
          name,
          noAsset: '',
          status: cleanStatus,
          serialNo: cleanSerialNo,
          purchaseDate: cleanPurchaseDate,
          cost: cleanCost,
          brand: cleanBrand,
          model: cleanModel,
          site: cleanSite,
          category: cleanCategory,
          department: cleanDepartment,
          pic: cleanPic,
          line: index + 1,
          isValid: false,
          error: 'Asset number is empty'
        })
        return
      }

      assets.push({
        name,
        noAsset,
        status: cleanStatus,
        serialNo: cleanSerialNo,
        purchaseDate: cleanPurchaseDate,
        cost: cleanCost,
        brand: cleanBrand,
        model: cleanModel,
        site: cleanSite,
        category: cleanCategory,
        department: cleanDepartment,
        pic: cleanPic,
        line: index + 1,
        isValid: true
      })
    })

    return assets
  }

  const handleInputChange = (value: string) => {
    setInputText(value)
    const parsed = parseInput(value)
    setParsedAssets(parsed)
    setSubmitResults(null)
  }

  const handleSubmit = async () => {
    const validAssets = parsedAssets.filter(asset => asset.isValid)
    
    if (validAssets.length === 0) {
      toast.error('No valid assets to add')
      return
    }

    setIsSubmitting(true)
    setSubmitResults(null)

    try {
      const response = await fetch('/api/assets/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assets: validAssets.map(asset => ({
            name: asset.name,
            noAsset: asset.noAsset,
            status: asset.status || 'Active',
            serialNo: asset.serialNo,
            purchaseDate: asset.purchaseDate,
            cost: asset.cost,
            brand: asset.brand,
            model: asset.model,
            site: asset.site,
            category: asset.category,
            department: asset.department,
            pic: asset.pic
          }))
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSubmitResults({
          success: result.successCount || 0,
          failed: result.failedCount || 0,
          errors: result.errors || []
        })

        if (result.successCount > 0) {
          toast.success(`Successfully added ${result.successCount} assets`)
          onSuccess()
        }

        if (result.failedCount > 0) {
          toast.error(`Failed to add ${result.failedCount} assets`)
        }

        // Clear form if all were successful
        if (result.failedCount === 0) {
          setInputText('')
          setParsedAssets([])
          setTimeout(() => {
            onOpenChange(false)
            setSubmitResults(null)
          }, 2000)
        }
      } else {
        toast.error(result.error || 'Failed to add assets')
      }
    } catch (error) {
      console.error('Bulk add error:', error)
      toast.error('Failed to add assets')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setInputText('')
      setParsedAssets([])
      setSubmitResults(null)
      onOpenChange(false)
    }
  }

  const validCount = parsedAssets.filter(asset => asset.isValid).length
  const invalidCount = parsedAssets.filter(asset => !asset.isValid).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Add Assets</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>
                Enter one asset per line in the format: <strong>NameOfAsset,NoAsset,Status,SerialNo,PurchaseDate,Cost,Brand,Model,Site,Category,Department,PIC</strong>
              </div>
              <div className="text-xs space-y-1">
                <div>• <strong>NameOfAsset</strong>: Asset name (can contain commas)</div>
                <div>• <strong>NoAsset</strong>: Asset number (required)</div>
                <div>• <strong>Status</strong>: Active, Broken, Lost/Missing, etc. (default: Active)</div>
                <div>• <strong>SerialNo</strong>: Serial number</div>
                <div>• <strong>PurchaseDate</strong>: YYYY-MM-DD format</div>
                <div>• <strong>Cost</strong>: Numeric value (e.g., 12000000)</div>
                <div>• <strong>Brand</strong>: Brand name</div>
                <div>• <strong>Model</strong>: Model name</div>
                <div>• <strong>Site</strong>: Site location</div>
                <div>• <strong>Category</strong>: Asset category</div>
                <div>• <strong>Department</strong>: Department name</div>
                <div>• <strong>PIC</strong>: Person in charge</div>
                <div>• Use <strong>"?"</strong> (without quotes) for empty optional fields</div>
              </div>
              <div>
                Example: <code className="bg-gray-100 px-1 rounded text-xs">Laptop Dell Core i5,FA001/I/01,Active,?,2024-01-15,12000000,Dell,?,Jakarta,Laptop,IT,John Doe</code>
              </div>
            </AlertDescription>
          </Alert>

          {/* Input Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Asset Data (one per line)</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const exampleData = `Laptop Dell Core i5,FA001/I/01,Active,?,2024-01-15,12000000,Dell,?,Jakarta,Laptop,IT,John Doe
Monitor LG 27 inch,FA002/I/01,Active,?,2024-01-20,3500000,LG,27UL650,Jakarta,Monitor,IT,Jane Smith
Keyboard Mechanical,FA003/I/01,Active,?,2024-01-25,800000,Logitech,MX Mechanical,?,Keyboard,IT,Bob Johnson
Mouse Wireless,FA004/I/01,Active,?,2024-02-01,300000,Logitech,MX Master 3,?,Mouse,IT,Alice Brown
Printer HP,FA005/I/01,Broken,?,2023-12-10,2500000,HP,LaserJet Pro,Jakarta,Printer,Admin,Charlie Wilson`
                  setInputText(exampleData)
                  handleInputChange(exampleData)
                }}
                disabled={isSubmitting}
              >
                Load Example
              </Button>
            </div>
            <Textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Laptop Dell Core i5,FA001/I/01,Active,?,2024-01-15,12000000,Dell,?,Jakarta,Laptop,IT,John Doe&#10;Monitor LG 27 inch,FA002/I/01,Active,?,2024-01-20,3500000,LG,27UL650,Jakarta,Monitor,IT,Jane Smith&#10;Keyboard Mechanical,FA003/I/01,Active,?,2024-01-25,800000,Logitech,MX Mechanical,?,Keyboard,IT,Bob Johnson"
              className="min-h-[200px] font-mono"
              disabled={isSubmitting}
            />
          </div>

          {/* Validation Summary */}
          {parsedAssets.length > 0 && (
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{validCount} valid</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center space-x-1 text-red-600">
                  <X className="h-4 w-4" />
                  <span>{invalidCount} invalid</span>
                </div>
              )}
            </div>
          )}

          {/* Validation Errors */}
          {parsedAssets.filter(asset => !asset.isValid).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600">Validation Errors:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsedAssets.filter(asset => !asset.isValid).map((asset, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Line {asset.line}: {asset.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Results */}
          {submitResults && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Results:</h4>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{submitResults.success} added successfully</span>
                </div>
                {submitResults.failed > 0 && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <X className="h-4 w-4" />
                    <span>{submitResults.failed} failed</span>
                  </div>
                )}
              </div>
              
              {submitResults.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {submitResults.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || validCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add {validCount} Asset{validCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}