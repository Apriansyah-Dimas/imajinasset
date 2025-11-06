import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, canManageUsers } from '@/lib/auth'

export async function GET(request: NextRequest) {
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
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get data counts - matching the clean data API tables
    const [
      assetsCount,
      employeesCount,
      soSessionsCount,
      nonAdminUsersCount,
      soAssetEntriesCount,
      assetCustomValuesCount,
      assetCustomFieldsCount,
      logsCount,
      backupsCount
    ] = await Promise.all([
      db.asset.count(),
      db.employee.count(),
      db.sOSession.count(),
      db.user.count({
        where: {
          isActive: true,
          role: {
            not: 'ADMIN'
          }
        }
      }),
      db.sOAssetEntry.count(),
      db.assetCustomValue.count(),
      db.assetCustomField.count(),
      // Try to get logs and backups counts, but handle if tables don't exist
      Promise.resolve().then(async () => {
        try {
          const result = await db.$queryRaw`SELECT COUNT(*) as count FROM logs` as any[]
          return Number(result[0]?.count || 0)
        } catch {
          return 0
        }
      }),
      Promise.resolve().then(async () => {
        try {
          const result = await db.$queryRaw`SELECT COUNT(*) as count FROM backups` as any[]
          return Number(result[0]?.count || 0)
        } catch {
          return 0
        }
      })
    ])

    return NextResponse.json({
      assets: assetsCount,
      employees: employeesCount,
      soSessions: soSessionsCount,
      nonAdminUsers: nonAdminUsersCount,
      // Additional data for detailed view
      soAssetEntries: soAssetEntriesCount,
      assetCustomValues: assetCustomValuesCount,
      assetCustomFields: assetCustomFieldsCount,
      logs: logsCount,
      backups: backupsCount
    })
  } catch (error) {
    console.error('Error fetching data summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data summary' },
      { status: 500 }
    )
  }
}