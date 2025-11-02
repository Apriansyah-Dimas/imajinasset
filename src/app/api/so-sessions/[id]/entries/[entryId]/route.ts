import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const sessionId = params.id
    const entryId = params.entryId

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

    // Get entry with asset data
    const entry = await db.sOAssetEntry.findUnique({
      where: { id: entryId },
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

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    if (entry.soSessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Entry does not belong to this session' },
        { status: 400 }
      )
    }

    // Transform data to match expected format (camelCase)
    const transformedEntry = {
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
    }

    return NextResponse.json({
      entry: transformedEntry,
      session
    })
  } catch (error) {
    console.error('Get SO entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const sessionId = params.id
    const entryId = params.entryId
    const body = await request.json()

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

    // Check if entry exists and belongs to this session
    const existingEntry = await db.sOAssetEntry.findUnique({
      where: { id: entryId }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    if (existingEntry.soSessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Entry does not belong to this session' },
        { status: 400 }
      )
    }

    // Update entry
    const updatedEntry = await db.sOAssetEntry.update({
      where: { id: entryId },
      data: {
        tempName: body.name,
        tempStatus: body.status,
        tempSerialNo: body.serialNo,
        tempPic: body.pic,
        tempBrand: body.brand,
        tempModel: body.model,
        tempCost: body.cost ? parseFloat(body.cost) : null,
        isIdentified: true,
        status: 'Updated'
      },
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

    // Transform response to match expected format
    const transformedEntry = {
      ...updatedEntry,
      soSessionId: updatedEntry.soSessionId,
      assetId: updatedEntry.assetId,
      scannedAt: updatedEntry.scannedAt,
      isIdentified: updatedEntry.isIdentified,
      tempName: updatedEntry.tempName,
      tempStatus: updatedEntry.tempStatus,
      tempSerialNo: updatedEntry.tempSerialNo,
      tempPic: updatedEntry.tempPic,
      tempBrand: updatedEntry.tempBrand,
      tempModel: updatedEntry.tempModel,
      tempCost: updatedEntry.tempCost,
      createdAt: updatedEntry.createdAt,
      updatedAt: updatedEntry.updatedAt,
      // Include asset data with noAsset field
      asset: updatedEntry.asset ? {
        ...updatedEntry.asset,
        noAsset: updatedEntry.asset.noAsset // Ensure noAsset field is included
      } : null
    }

    return NextResponse.json({
      success: true,
      message: 'Entry updated successfully',
      entry: transformedEntry
    })
  } catch (error) {
    console.error('Update SO entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}