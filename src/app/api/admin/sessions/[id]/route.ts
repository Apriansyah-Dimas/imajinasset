import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await db.sOSession.findUnique({
      where: { id },
      include: {
        soAssetEntries: {
          include: {
            asset: {
              select: {
                noAsset: true,
                name: true,
                status: true
              }
            }
          },
          orderBy: { scannedAt: 'desc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Add computed fields
    const sessionWithStats = {
      ...session,
      scannedAssets: session.soAssetEntries.length,
      verifiedAssets: session.soAssetEntries.filter(entry => entry.isIdentified).length,
      completionRate: session.totalAssets > 0
        ? Math.round((session.soAssetEntries.length / session.totalAssets) * 100)
        : 0
    }

    return NextResponse.json(sessionWithStats)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, data } = body

    const session = await db.sOSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    let result

    switch (action) {
      case 'cancel':
        if (session.status !== 'Active') {
          return NextResponse.json(
            { error: 'Cannot cancel a non-active session' },
            { status: 400 }
          )
        }
        result = await db.sOSession.update({
          where: { id },
          data: {
            status: 'Cancelled'
          }
        })
        break

      case 'complete':
        if (session.status !== 'Active') {
          return NextResponse.json(
            { error: 'Cannot complete a non-active session' },
            { status: 400 }
          )
        }

        // Get verified assets
        const verifiedAssets = await db.sOAssetEntry.findMany({
          where: {
            soSessionId: id,
            isIdentified: true
          }
        })

        if (verifiedAssets.length === 0) {
          return NextResponse.json(
            { error: 'No verified assets found to complete session' },
            { status: 400 }
          )
        }

        const brokenAssets = new Map<string, string | null>()

        // Update main assets with verified data
        const updatePromises = verifiedAssets.map(async (entry) => {
          const updateData: any = {}

          if (entry.tempName) updateData.name = entry.tempName
          if (entry.tempStatus) updateData.status = entry.tempStatus
          if (entry.tempSerialNo) updateData.serialNo = entry.tempSerialNo
          if (entry.tempPic) updateData.pic = entry.tempPic
          if (entry.tempBrand) updateData.brand = entry.tempBrand
          if (entry.tempModel) updateData.model = entry.tempModel
          if (entry.tempCost !== null && entry.tempCost !== undefined) updateData.cost = entry.tempCost

          if (entry.tempStatus === 'Broken') {
            brokenAssets.set(entry.assetId, entry.tempNotes ?? null)
          }

          if (Object.keys(updateData).length > 0) {
            return db.asset.update({
              where: { id: entry.assetId },
              data: updateData
            })
          }

          return Promise.resolve()
        })

        await Promise.all(updatePromises)

        // Mark session as completed
        result = await db.sOSession.update({
          where: { id },
          data: {
            status: 'Completed',
            completedAt: new Date()
          }
        })
        break

      case 'update':
        result = await db.sOSession.update({
          where: { id },
          data: {
            name: data.name || session.name,
            year: data.year ? parseInt(data.year) : session.year,
            description: data.description !== undefined ? data.description : session.description
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await db.sOSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status === 'Active') {
      return NextResponse.json(
        { error: 'Cannot delete an active session. Cancel it first.' },
        { status: 400 }
      )
    }

    // Delete all Stock Opname Entries for this session
    await db.sOAssetEntry.deleteMany({
      where: { soSessionId: id }
    })

    // Delete the session
    await db.sOSession.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Session deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
