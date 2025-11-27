import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canCompleteSOSession } from '@/lib/auth'
import { recordAssetEvent } from '@/lib/asset-events'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => null)
    const completionNotesInput =
      body && typeof body.completionNotes === 'string'
        ? body.completionNotes
        : typeof body?.notes === 'string'
          ? body.notes
          : ''
    const trimmedNotes = completionNotesInput.trim()
    const completionNotes = trimmedNotes ? trimmedNotes.slice(0, 5000) : ''

    if (!completionNotes) {
      return NextResponse.json(
        { error: 'Completion notes are required' },
        { status: 400 }
      )
    }

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

    // Check if user has permission to complete SO session
    if (!canCompleteSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to complete SO session' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await params

    // Check if session exists
    const session = await db.sOSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: {
            soAssetEntries: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'SO Session not found' },
        { status: 404 }
      )
    }

    if (session.status !== 'Active') {
      return NextResponse.json(
        { error: 'Only active sessions can be completed' },
        { status: 400 }
      )
    }

    // Update session status to completed
    const updatedSession = await db.sOSession.update({
      where: { id: sessionId },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        scannedAssets: session._count.soAssetEntries,
        completionNotes // Now using the proper completionNotes field
      }
    })

    // Get all SO asset entries for this session
    const soAssetEntries = await db.sOAssetEntry.findMany({
      where: { soSessionId: sessionId },
      include: { asset: true }
    })

    console.log('DEBUG: Syncing SO entries to main assets:', soAssetEntries.length)

    // Update main assets with data from SO session & record history only upon completion
    for (const entry of soAssetEntries) {
      if (entry.isIdentified && entry.asset) {
        const updates = {
          name: entry.tempName || entry.asset.name,
          status: entry.tempStatus || entry.asset.status,
          serialNo: entry.tempSerialNo || entry.asset.serialNo,
          pic: entry.tempPic || entry.asset.pic,
          brand: entry.tempBrand || entry.asset.brand,
          model: entry.tempModel || entry.asset.model,
          cost: entry.tempCost || entry.asset.cost,
          notes: entry.tempNotes ?? entry.asset.notes,
        }

        const changes: Array<{ field: string; before: any; after: any }> = []
        const addChange = (field: string, before: any, after: any) => {
          const beforeVal = before ?? null
          const afterVal = after ?? null
          if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            changes.push({ field, before: beforeVal, after: afterVal })
          }
        }

        addChange('name', entry.asset.name, updates.name)
        addChange('status', entry.asset.status, updates.status)
        addChange('serialNo', entry.asset.serialNo, updates.serialNo)
        addChange('pic', entry.asset.pic, updates.pic)
        addChange('brand', entry.asset.brand, updates.brand)
        addChange('model', entry.asset.model, updates.model)
        addChange('cost', entry.asset.cost, updates.cost)
        addChange('notes', entry.asset.notes, updates.notes)

        await db.asset.update({
          where: { id: entry.assetId },
          data: {
            ...updates,
            updatedAt: new Date()
          }
        })

        if (changes.length > 0) {
          try {
            await recordAssetEvent({
              assetId: entry.assetId,
              type: 'SO_UPDATE',
              actor: user.name || user.email,
              soSessionId: sessionId,
              soAssetEntryId: entry.id,
              payload: {
                sessionName: session.name,
                changes,
              },
            })
          } catch (eventError) {
            console.error('Failed to record SO completion event:', eventError)
          }
        }
      }
    }

    console.log('DEBUG: Completed syncing SO entries to main assets')

    return NextResponse.json({
      success: true,
      message: 'SO Session completed successfully and main assets updated',
      session: updatedSession,
      assetsUpdated: soAssetEntries.filter(e => e.isIdentified).length
    })
  } catch (error) {
    console.error('Complete SO session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
