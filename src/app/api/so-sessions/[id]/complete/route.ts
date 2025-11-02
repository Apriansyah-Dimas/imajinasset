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
        totalAssets: session._count.soAssetEntries
      }
    })

    return NextResponse.json({
      success: true,
      message: 'SO Session completed successfully',
      session: updatedSession
    })
  } catch (error) {
    console.error('Complete SO session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
