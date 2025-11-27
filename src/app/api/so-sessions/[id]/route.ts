import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canViewSOSession } from '@/lib/auth'

export async function GET(
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

    // Check if user has permission to view SO sessions
    if (!canViewSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view SO sessions' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await params

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

    // Only Admin can update SO sessions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Admin can update SO sessions.' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await params
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

    const updateData: Record<string, unknown> = {}

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim()
    }
    if (typeof body.year === 'number') {
      updateData.year = body.year
    }
    if (typeof body.description === 'string' || body.description === null) {
      updateData.description = body.description
    }

    if (body.startDate) {
      const planStart = new Date(body.startDate)
      if (Number.isNaN(planStart.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate' },
          { status: 400 }
        )
      }
      updateData.planStart = planStart
    }

    if (body.endDate) {
      const planEnd = new Date(body.endDate)
      if (Number.isNaN(planEnd.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate' },
          { status: 400 }
        )
      }
      updateData.planEnd = planEnd
    }

    if (updateData.planStart && updateData.planEnd) {
      if ((updateData.planEnd as Date) < (updateData.planStart as Date)) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedSession = await db.sOSession.update({
      where: { id: sessionId },
      data: updateData
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
