import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { assetId } = await request.json()
    const sessionId = params.id

    if (!assetId || !sessionId) {
      return NextResponse.json(
        { error: 'Asset ID and Session ID are required' },
        { status: 400 }
      )
    }

    // Check if session exists and is active
    const session = await db.sOSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'SO Session not found' },
        { status: 404 }
      )
    }

    if (session.status !== 'Active') {
      return NextResponse.json(
        { error: 'SO Session is not active' },
        { status: 400 }
      )
    }

    // Check if asset exists
    const asset = await db.asset.findUnique({
      where: { id: assetId },
      include: {
        site: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } }
      }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Check if already scanned in this session
    const existingEntry = await db.sOAssetEntry.findFirst({
      where: {
        soSessionId: sessionId,
        assetId: assetId
      }
    })

    if (existingEntry) {
      return NextResponse.json({
        success: false,
        message: 'Asset already scanned in this session',
        entry: existingEntry
      })
    }

    // Create SO asset entry
    const entry = await db.sOAssetEntry.create({
      data: {
        soSessionId: sessionId,
        assetId: assetId,
        status: 'Scanned',
        isIdentified: true,
        tempName: asset.name,
        tempStatus: asset.status,
        tempSerialNo: asset.serialNo,
        tempPic: asset.employee?.name || asset.pic,
        tempBrand: asset.brand,
        tempModel: asset.model,
        tempCost: asset.cost
      }
    })

    // Update session counts
    await db.sOSession.update({
      where: { id: sessionId },
      data: {
        scannedAssets: {
          increment: 1
        }
      }
    })

    // Return asset data with noAsset field
    const responseAsset = {
      ...asset,
      noAsset: asset.noAsset // Ensure noAsset field is included
    }

    return NextResponse.json({
      success: true,
      message: 'Asset scanned successfully',
      asset: responseAsset,
      entry
    })
  } catch (error) {
    console.error('Scan asset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}