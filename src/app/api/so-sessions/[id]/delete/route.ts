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