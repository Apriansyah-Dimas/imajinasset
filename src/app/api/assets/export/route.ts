import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest
) {
  try {
    console.log('DEBUG: Starting asset export...')
    
    // Get all assets with their relations and custom values
    const assets = await db.asset.findMany({
      orderBy: {
        dateCreated: 'desc'
      },
      include: {
        site: true,
        category: true,
        department: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            position: true,
            isActive: true
          }
        },
        customValues: {
          include: {
            customField: true
          }
        }
      }
    })

    console.log('DEBUG: Found assets for export:', assets.length)

    // Get all active custom fields for headers
    const customFields = await db.assetCustomField.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    })

    console.log('DEBUG: Found custom fields:', customFields.length)

    // Build CSV headers
    const baseHeaders = [
      'NameOfAsset',
      'NoAsset',
      'Status',
      'SerialNo',
      'PurchaseDate',
      'Cost',
      'Brand',
      'Model',
      'Site',
      'Category',
      'Department',
      'PIC',
      'DateCreated'
    ]

    const customFieldHeaders = customFields.map(field => field.label)
    const headers = [...baseHeaders, ...customFieldHeaders]

    const csvRows = [
      headers.join(','),
      ...assets.map(asset => {
        // Base asset data
        const baseRow = [
          // Escape commas and quotes in asset name
          `"${(asset.name || '').replace(/"/g, '""')}"`,
          `"${(asset.noAsset || '').replace(/"/g, '""')}"`,
          `"${(asset.status || '').replace(/"/g, '""')}"`,
          `"${(asset.serialNo || '').replace(/"/g, '""')}"`,
          asset.purchaseDate ? `"${asset.purchaseDate.toISOString().split('T')[0]}"` : '""',
          `"${(asset.cost?.toString() || '').replace(/"/g, '""')}"`,
          `"${(asset.brand || '').replace(/"/g, '""')}"`,
          `"${(asset.model || '').replace(/"/g, '""')}"`,
          `"${(asset.site?.name || '').replace(/"/g, '""')}"`,
          `"${(asset.category?.name || '').replace(/"/g, '""')}"`,
          `"${(asset.department?.name || '').replace(/"/g, '""')}"`,
          `"${(asset.employee?.name ? asset.employee.name : (asset.pic || '')).replace(/"/g, '""')}"`,
          `"${asset.dateCreated.toISOString().split('T')[0]}"`
        ]

        // Custom field values
        const customFieldValues = customFields.map(field => {
          const customValue = asset.customValues.find(cv => cv.customFieldId === field.id)

          if (!customValue) return '""'

          switch (field.fieldType) {
            case 'TEXT':
            case 'TEXTAREA':
            case 'SELECT':
              return `"${(customValue.stringValue || '').replace(/"/g, '""')}"`
            case 'NUMBER':
              return `"${(customValue.numberValue?.toString() || '').replace(/"/g, '""')}"`
            case 'DATE':
              return customValue.dateValue ? `"${new Date(customValue.dateValue).toISOString().split('T')[0]}"` : '""'
            case 'BOOLEAN':
              return customValue.booleanValue ? '"Yes"' : '"No"'
            default:
              return '""'
          }
        })

        const row = [...baseRow, ...customFieldValues]
        return row.join(',')
      })
    ]

    const csvContent = csvRows.join('\n')
    console.log('DEBUG: Generated CSV content length:', csvContent.length)

    // Create response with CSV content
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="asset-management-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

    console.log('DEBUG: Asset export completed successfully')
    return response
  } catch (error) {
    console.error('DEBUG: Export assets error:', error)
    return NextResponse.json(
      { error: 'Failed to export assets' },
      { status: 500 }
    )
  }
}
