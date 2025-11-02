import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id

    // Get session with entry count
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

    return NextResponse.json({
      session: {
        ...session,
        scannedAssets: session._count.soAssetEntries
      }
    })
  } catch (error) {
    console.error('Get SO session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    const body = await request.json()

    // Check if session exists
    const existingSession = await db.sOSession.findUnique({
      where: { id: sessionId }
    })

    if (!existingSession) {
      return NextResponse.json(
        { error: 'SO Session not found' },
        { status: 404 }
      )
    }

    // Update session
    const updatedSession = await db.sOSession.update({
      where: { id: sessionId },
      data: {
        name: body.name,
        year: body.year,
        description: body.description
      }
    })

    return NextResponse.json({
      success: true,
      message: 'SO Session updated successfully',
      session: updatedSession
    })
  } catch (error) {
    console.error('Update SO session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}