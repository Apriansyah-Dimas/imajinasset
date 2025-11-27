import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { verifyToken, canCreateSOSession, canViewSOSession } from '@/lib/auth'

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

    // Check if user has permission to view SO sessions
    if (!canViewSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view SO sessions' },
        { status: 403 }
      )
    }

    const [sessions, globalAssetCount] = await Promise.all([
      db.sOSession.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      db.asset.count()
    ])

    // Convert field names to camelCase for frontend compatibility
    const camelCaseSessions = sessions.map(session => ({
      id: session.id,
      name: session.name,
      year: session.year,
      description: session.description,
      planStart: session.planStart,
      planEnd: session.planEnd,
      notes: session.notes,
      status: session.status,
      totalAssets: globalAssetCount,
      scannedAssets: session.scannedAssets,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completionNotes: session.completionNotes
    }))

    return NextResponse.json(camelCaseSessions)
  } catch (error) {
    console.error('Error fetching SO sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SO sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
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

    // Check if user has permission to create SO session
    if (!canCreateSOSession(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Admin can create SO sessions.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, year, description, startDate, endDate } = body

    if (!name || !year || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, year, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const planStart = new Date(startDate)
    const planEnd = new Date(endDate)

    if (Number.isNaN(planStart.getTime()) || Number.isNaN(planEnd.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start or end date' },
        { status: 400 }
      )
    }

    if (planEnd < planStart) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Get total assets count
    const totalAssets = await db.asset.count()

    const session = await db.sOSession.create({
      data: {
        id: randomUUID(),
        name,
        year,
        description,
        planStart,
        planEnd,
        status: 'Active',
        totalAssets: totalAssets || 0,
        scannedAssets: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      id: session.id,
      name: session.name,
      year: session.year,
      description: session.description,
      planStart: session.planStart,
      planEnd: session.planEnd,
      notes: session.notes,
      status: session.status,
      totalAssets: session.totalAssets,
      scannedAssets: session.scannedAssets,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completionNotes: session.completionNotes
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating SO session:', error)
    return NextResponse.json(
      { error: 'Failed to create SO session' },
      { status: 500 }
    )
  }
}
