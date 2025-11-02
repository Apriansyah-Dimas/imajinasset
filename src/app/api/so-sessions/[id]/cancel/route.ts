import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id

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

    if (session.status !== 'Active') {
      return NextResponse.json(
        { error: 'Only active sessions can be cancelled' },
        { status: 400 }
      )
    }

    // Update session status to cancelled
    const updatedSession = await db.sOSession.update({
      where: { id: sessionId },
      data: {
        status: 'Cancelled',
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'SO Session cancelled successfully',
      session: updatedSession
    })
  } catch (error) {
    console.error('Cancel SO session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}