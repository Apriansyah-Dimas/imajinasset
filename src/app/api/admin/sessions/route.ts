import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.status = status
    }

    const [sessions, total] = await Promise.all([
      db.sOSession.findMany({
        where,
        include: {
          soAssetEntries: {
            select: {
              isIdentified: true
            }
          },
          _count: {
            select: {
              soAssetEntries: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.sOSession.count({ where })
    ])

    // Add computed fields
    const sessionsWithStats = sessions.map(session => ({
      ...session,
      scannedAssets: session._count.soAssetEntries,
      verifiedAssets: session.soAssetEntries.filter(entry => entry.isIdentified).length,
      completionRate: session.totalAssets > 0
        ? Math.round((session._count.soAssetEntries / session.totalAssets) * 100)
        : 0
    }))

    return NextResponse.json({
      sessions: sessionsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, year, description } = body

    if (!name || !year) {
      return NextResponse.json(
        { error: 'Name and year are required' },
        { status: 400 }
      )
    }

    // Get total assets count
    const totalAssets = await db.asset.count()

    const session = await db.sOSession.create({
      data: {
        name,
        year: parseInt(year),
        description,
        totalAssets,
        status: 'Active',
        startedAt: new Date()
      }
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}