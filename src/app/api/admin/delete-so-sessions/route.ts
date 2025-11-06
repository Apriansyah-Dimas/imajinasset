import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canManageUsers } from '@/lib/auth'

export async function DELETE(request: NextRequest) {
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

    // Check if user has permission to manage users (admin only)
    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete SO sessions' },
        { status: 403 }
      )
    }

    // Delete all SO sessions and their entries
    const deletedEntries = await db.sOAssetEntry.deleteMany({})
    const deletedSessions = await db.sOSession.deleteMany({})

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedSessions.count} SO sessions and ${deletedEntries.count} scanned assets`,
      deletedSessionsCount: deletedSessions.count,
      deletedEntriesCount: deletedEntries.count
    })
  } catch (error) {
    console.error('Error deleting SO sessions:', error)
    return NextResponse.json(
      { error: 'Failed to delete SO sessions' },
      { status: 500 }
    )
  }
}