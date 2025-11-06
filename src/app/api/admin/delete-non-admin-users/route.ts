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
        { error: 'Insufficient permissions to delete users' },
        { status: 403 }
      )
    }

    // Delete all non-admin users (keep admin users)
    const deleteResult = await db.user.deleteMany({
      where: {
        isActive: true,
        role: {
          not: 'ADMIN'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} non-admin users`,
      deletedCount: deleteResult.count
    })
  } catch (error) {
    console.error('Error deleting non-admin users:', error)
    return NextResponse.json(
      { error: 'Failed to delete non-admin users' },
      { status: 500 }
    )
  }
}