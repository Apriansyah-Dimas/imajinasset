import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canScanInSOSession } from '@/lib/auth'

const assetInclude = {
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

const transformEntry = (entry: any) => ({
  ...entry,
  soSessionId: entry.soSessionId,
  assetId: entry.assetId,
  scannedAt: entry.scannedAt,
  isIdentified: entry.isIdentified,
  isCrucial: entry.isCrucial ?? false,
  crucialNotes: entry.crucialNotes ?? null,
  tempName: entry.tempName,
  tempStatus: entry.tempStatus,
  tempSerialNo: entry.tempSerialNo,
  tempPic: entry.tempPic,
  tempBrand: entry.tempBrand,
  tempModel: entry.tempModel,
  tempCost: entry.tempCost,
  asset: entry.asset
    ? {
        ...entry.asset,
        noAsset: entry.asset.noAsset
      }
    : null
})

const safeDecode = (value: string) => {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (error) {
    console.warn('[scan-route] Failed to decode asset number, using raw value.', error)
    return value
  }
}

const normalizeAssetNumber = async (number: string) => {
  if (!number) return null
  const decoded = safeDecode(number).trim()

  const normalize = (value: string) => value.trim()
  const attempts = Array.from(
    new Set(
      [
        decoded,
        decoded.toUpperCase(),
        decoded.toLowerCase(),
        decoded.replace(/\./g, ''),
        decoded.replace(/-/g, ''),
        decoded.replace(/\s+/g, '')
      ]
        .filter(Boolean)
        .map(normalize)
    )
  )

  for (const attempt of attempts) {
    const asset = await db.asset.findFirst({
      where: { noAsset: attempt },
      include: assetInclude
    })
    if (asset) return asset
  }

  // fallback contains
  const variations = Array.from(new Set([decoded, decoded.toLowerCase(), decoded.toUpperCase()].filter(Boolean)))
  if (variations.length > 0) {
    const fallback = await db.asset.findFirst({
      where: {
        OR: variations.map(value => ({
          noAsset: { contains: value }
        }))
      },
      include: assetInclude
    })

    if (fallback) return fallback
  }

  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!canScanInSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to scan assets' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await params
    const body = await request.json()
    const { assetNumber, assetId, source = 'camera', isCrucial = false, crucialNotes = null } = body

    if (!assetNumber && !assetId) {
      return NextResponse.json(
        { error: 'Asset number or ID is required' },
        { status: 400 }
      )
    }

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

    let asset
    if (assetId) {
      asset = await db.asset.findUnique({
        where: { id: assetId },
        include: assetInclude
      })
    } else {
      asset = await normalizeAssetNumber(String(assetNumber))
    }

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    const existingEntry = await db.sOAssetEntry.findFirst({
      where: { soSessionId: sessionId, assetId: asset.id },
      include: { asset: { include: assetInclude } }
    })

    if (existingEntry) {
      return NextResponse.json({
        success: true,
        alreadyScanned: true,
        message: 'Asset already scanned in this session',
        entry: transformEntry(existingEntry),
        asset: existingEntry.asset
      })
    }

    const newEntry = await db.sOAssetEntry.create({
      data: {
        soSessionId: sessionId,
        assetId: asset.id,
        tempName: asset.name,
        tempStatus: asset.status,
        tempSerialNo: asset.serialNo,
        tempPic: asset.pic,
        tempBrand: asset.brand,
        tempModel: asset.model,
        tempCost: asset.cost,
        status: 'Scanned',
        isIdentified: false,
        isCrucial: Boolean(isCrucial),
        crucialNotes: isCrucial ? (typeof crucialNotes === 'string' ? crucialNotes.trim() || null : null) : null
      },
      include: {
        asset: { include: assetInclude }
      }
    })

    await db.sOSession.update({
      where: { id: sessionId },
      data: {
        scannedAssets: { increment: 1 },
        startedAt: session.startedAt ?? new Date()
      }
    })

    return NextResponse.json({
      success: true,
      alreadyScanned: false,
      message: 'Asset scanned successfully',
      entry: transformEntry(newEntry),
      asset: newEntry.asset,
      source
    })
  } catch (error) {
    console.error('Scan asset error:', error)
    return NextResponse.json(
      { error: 'Failed to process scan' },
      { status: 500 }
    )
  }
}
