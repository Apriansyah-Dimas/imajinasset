import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Check if session exists
    const session = await db.sOSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'SO Session not found' },
        { status: 404 }
      )
    }

    // Build where clause
    const where: any = { soSessionId: sessionId }
    if (status && status !== 'all') {
      where.status = status
    }

    // Apply search
    if (search) {
      where.OR = [
        { tempName: { contains: search, mode: 'insensitive' } },
        { asset: { is: { noAsset: { contains: search, mode: 'insensitive' } } } },
        { asset: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { asset: { is: { serialNo: { contains: search, mode: 'insensitive' } } } },
        { tempBrand: { contains: search, mode: 'insensitive' } },
        { tempModel: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count
    const totalCount = await db.sOAssetEntry.count({ where })

    // Apply pagination
    const skip = (page - 1) * limit
    const entries = await db.sOAssetEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scannedAt: 'desc' },
      include: {
        asset: {
          include: {
            site: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            employee: { select: { id: true, name: true } }
          }
        }
      }
    })

    // Transform data to match expected format (camelCase)
    const transformedEntries = entries.map(entry => ({
      ...entry,
      soSessionId: entry.soSessionId,
      assetId: entry.assetId,
      scannedAt: entry.scannedAt,
      isIdentified: entry.isIdentified,
      tempName: entry.tempName,
      tempStatus: entry.tempStatus,
      tempSerialNo: entry.tempSerialNo,
      tempPic: entry.tempPic,
      tempBrand: entry.tempBrand,
      tempModel: entry.tempModel,
      tempCost: entry.tempCost,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      // Include asset data with noAsset field
      asset: entry.asset ? {
        ...entry.asset,
        noAsset: entry.asset.noAsset // Ensure noAsset field is included
      } : null
    }))

    // Get count for pagination
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      entries: transformedEntries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      session
    })
  } catch (error) {
    console.error('Get SO entries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
