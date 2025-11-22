import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canScanInSOSession } from '@/lib/auth'

const parseCostInput = (value: any) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

const pickDefined = (primary: any, secondary: any) => (primary !== undefined ? primary : secondary)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: sessionId, entryId } = await params

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
            employee: { select: { id: true, employeeId: true, name: true, email: true, department: true, position: true, isActive: true } }
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
      tempNotes: entry.tempNotes,
      tempPicId: entry.asset?.employee?.id || null,
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
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: sessionId, entryId } = await params
    const body = await request.json()

    console.log('DEBUG: Received update body:', body)
    console.log('DEBUG: body.tempStatus:', body.tempStatus)
    console.log('DEBUG: body.status:', body.status)
    console.log('DEBUG: body.tempPic:', body.tempPic)
    console.log('DEBUG: body.pic:', body.pic)

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

    // Update entry - ensure undefined fields are ignored while null clears values
    const updateData: any = {
      tempName: pickDefined(body.tempName, body.name),
      tempStatus: pickDefined(body.tempStatus, body.status),
      tempSerialNo: pickDefined(body.tempSerialNo, body.serialNo),
      tempPic: pickDefined(body.tempPic, body.pic),
      tempBrand: pickDefined(body.tempBrand, body.brand),
      tempModel: pickDefined(body.tempModel, body.model),
      tempCost: parseCostInput(pickDefined(body.tempCost, body.cost)),
      tempNotes: pickDefined(body.tempNotes, body.notes),
      isIdentified: body.isIdentified !== undefined ? body.isIdentified : true,
      status: 'Updated'
    }

    console.log('DEBUG: Update data prepared:', updateData)

    const updatedEntry = await db.sOAssetEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        asset: {
          include: {
            site: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            employee: { select: { id: true, employeeId: true, name: true, email: true, department: true, position: true, isActive: true } }
          }
        }
      }
    })

    const currentSnapshot = {
      tempName: existingEntry.tempName,
      tempStatus: existingEntry.tempStatus,
      tempSerialNo: existingEntry.tempSerialNo,
      tempPic: existingEntry.tempPic,
      tempBrand: existingEntry.tempBrand,
      tempModel: existingEntry.tempModel,
      tempCost: existingEntry.tempCost,
      tempNotes: existingEntry.tempNotes,
      isIdentified: existingEntry.isIdentified,
    }

    const updatedSnapshot = {
      tempName: updatedEntry.tempName,
      tempStatus: updatedEntry.tempStatus,
      tempSerialNo: updatedEntry.tempSerialNo,
      tempPic: updatedEntry.tempPic,
      tempBrand: updatedEntry.tempBrand,
      tempModel: updatedEntry.tempModel,
      tempCost: updatedEntry.tempCost,
      tempNotes: updatedEntry.tempNotes,
      isIdentified: updatedEntry.isIdentified,
    }

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
      tempPicId: updatedEntry.asset?.employee?.id || null,
      tempNotes: updatedEntry.tempNotes,
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


