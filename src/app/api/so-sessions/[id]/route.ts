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