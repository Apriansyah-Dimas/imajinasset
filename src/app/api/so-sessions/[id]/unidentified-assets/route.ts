import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the SO session details
    const session = await db.sOSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'SO Session not found' },
        { status: 404 }
      )
    }

    // Get all assets from the database
    const allAssets = await db.asset.findMany({
      include: {
        site: true,
        category: true,
        department: true
      },
      orderBy: {
        noAsset: 'asc'
      }
    })

    // Get all scanned assets for this session
    const scannedEntries = await db.sOAssetEntry.findMany({
      where: { soSessionId: id },
      include: {
        asset: {
          include: {
            site: true,
            category: true,
            department: true
          }
        }
      },
      orderBy: {
        scannedAt: 'desc'
      }
    })

    // Get scanned asset IDs
    const scannedAssetIds = scannedEntries.map(entry => entry.assetId)

    // Find assets that haven't been scanned yet
    const missingAssets = allAssets.filter(asset => !scannedAssetIds.includes(asset.id))

    // Get statistics
    const totalAssets = allAssets.length
    const scannedAssets = scannedEntries.length
    const missingCount = missingAssets.length
    const identifiedCount = scannedEntries.filter(entry => entry.isIdentified).length
    const unidentifiedCount = scannedEntries.filter(entry => !entry.isIdentified).length

    // Group missing assets by site, category, and department for better analysis
    const missingBySite = missingAssets.reduce((acc, asset) => {
      const siteName = asset.site?.name || 'Unknown Site'
      if (!acc[siteName]) {
        acc[siteName] = []
      }
      acc[siteName].push(asset)
      return acc
    }, {} as Record<string, typeof missingAssets>)

    const missingByCategory = missingAssets.reduce((acc, asset) => {
      const categoryName = asset.category?.name || 'Unknown Category'
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(asset)
      return acc
    }, {} as Record<string, typeof missingAssets>)

    const missingByDepartment = missingAssets.reduce((acc, asset) => {
      const departmentName = asset.department?.name || 'Unknown Department'
      if (!acc[departmentName]) {
        acc[departmentName] = []
      }
      acc[departmentName].push(asset)
      return acc
    }, {} as Record<string, typeof missingAssets>)

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        year: session.year,
        description: session.description,
        status: session.status,
        totalAssets: session.totalAssets,
        scannedAssets: session.scannedAssets
      },
      statistics: {
        totalAssets,
        scannedAssets,
        missingAssets: missingCount,
        identifiedAssets: identifiedCount,
        unidentifiedAssets: unidentifiedCount,
        completionPercentage: totalAssets > 0 ? Math.round((scannedAssets / totalAssets) * 100) : 0,
        identificationPercentage: scannedAssets > 0 ? Math.round((identifiedCount / scannedAssets) * 100) : 0
      },
      missingAssets,
      groupedBy: {
        site: missingBySite,
        category: missingByCategory,
        department: missingByDepartment
      },
      scannedEntries
    })

  } catch (error) {
    console.error('Error fetching missing assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch missing assets' },
      { status: 500 }
    )
  }
}