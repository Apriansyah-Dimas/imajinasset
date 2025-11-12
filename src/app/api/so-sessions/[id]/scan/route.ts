import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canScanInSOSession } from '@/lib/auth'

const assetRelations = {
  site: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
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
  }
}

const formatEmployeeLabel = (employee: {
  name: string | null
}) => {
  if (!employee?.name) return null
  return employee.name
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Check if user has permission to scan in SO session
    if (!canScanInSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to scan assets' },
        { status: 403 }
      )
    }

    const { assetId, assetNumber } = await request.json()
    const { id: sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!assetId && !assetNumber) {
      return NextResponse.json(
        { error: 'Either Asset ID or Asset Number is required' },
        { status: 400 }
      )
    }

    const normalizedAssetNumber =
      typeof assetNumber === 'string' ? assetNumber.trim() : ''

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

    // Resolve asset (by ID or number)
    let asset: any = null
    if (assetId) {
      asset = await db.asset.findUnique({
        where: { id: assetId },
        include: assetRelations
      })
    } else if (normalizedAssetNumber) {
      asset = await db.asset.findUnique({
        where: { noAsset: normalizedAssetNumber },
        include: assetRelations
      })
    }

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    const resolvedAssetId = asset.id

    // Check if already scanned in this session
    const existingEntry = await db.sOAssetEntry.findFirst({
      where: {
        soSessionId: sessionId,
        assetId: resolvedAssetId
      },
      include: {
        asset: {
          include: assetRelations
        }
      }
    })

    if (existingEntry) {
      return NextResponse.json({
        success: false,
        message: 'Asset already scanned in this session',
        entry: existingEntry,
        assetNumber: asset.noAsset
      })
    }

    // Create SO asset entry
    const employeeLabel = asset.employee
      ? formatEmployeeLabel({
          name: asset.employee.name
        })
      : null

    const entry = await db.sOAssetEntry.create({
      data: {
        soSessionId: sessionId,
        assetId: resolvedAssetId,
        status: 'Scanned',
        isIdentified: true,
        tempName: asset.name,
        tempStatus: asset.status,
        tempSerialNo: asset.serialNo,
        tempPic: employeeLabel ?? asset.pic ?? null,
        tempBrand: asset.brand,
        tempModel: asset.model,
        tempCost: asset.cost
      },
      include: {
        asset: {
          include: assetRelations
        }
      }
    })

    // Update session scanned count
    await db.sOSession.update({
      where: { id: sessionId },
      data: {
        scannedAssets: {
          increment: 1
        }
      }
    })

    // Return asset data with noAsset field
    return NextResponse.json({
      success: true,
      message: 'Asset scanned successfully',
      entry: {
        ...entry,
        tempPicId: entry.asset?.employee?.id ?? null,
        asset: {
          ...entry.asset,
          noAsset: asset.noAsset,
          employee: entry.asset?.employee ?? null
        }
      },
      assetNumber: asset.noAsset
    })
  } catch (error) {
    console.error('Scan asset error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}
