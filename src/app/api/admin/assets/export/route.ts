import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get('authorization')

    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const token = authorization.replace('Bearer ', '')
    const decoded = JSON.parse(atob(token.split('.')[1]))

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Fetch all assets with related data
    const assets = await db.asset.findMany({
      include: {
        category: true,
        site: true,
        department: true
      },
      orderBy: {
        createdat: 'desc'
      }
    })

    // Convert to CSV
    const csvHeaders = [
      'ID',
      'Asset Number',
      'Name',
      'Serial Number',
      'Brand',
      'Model',
      'Status',
      'PIC',
      'Cost',
      'Category',
      'Site',
      'Department',
      'Notes',
      'Created At',
      'Updated At'
    ]

    const csvRows = assets.map(asset => [
      asset.id,
      asset.noAsset,
      asset.name,
      asset.serialNo,
      asset.brand || '',
      asset.model || '',
      asset.status,
      asset.pic,
      asset.cost || '',
      asset.category?.name || '',
      asset.site?.name || '',
      asset.department?.name || '',
      asset.notes || '',
      asset.createdat.toISOString(),
      asset.updatedat.toISOString()
    ])

    // Build CSV string
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="asset-management-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting assets:', error)
    return NextResponse.json(
      { error: 'Failed to export assets' },
      { status: 500 }
    )
  }
}
