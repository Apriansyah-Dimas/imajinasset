import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canCancelSOSession } from '@/lib/auth'

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

    // Check if user has permission to manage SO sessions
    if (!canCancelSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete SO sessions' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await params

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

    // Delete all entries for this session first
    await db.sOAssetEntry.deleteMany({
      where: { soSessionId: sessionId }
    })

    // Delete the session
    await db.sOSession.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({
      success: true,
      message: 'SO Session deleted successfully'
    })
  } catch (error) {
    console.error('Delete SO session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}