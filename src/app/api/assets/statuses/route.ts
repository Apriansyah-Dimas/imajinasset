import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const statuses = await db.asset.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: {
        status: 'asc'
      }
    })

    return NextResponse.json(
      statuses
        .map((entry) => entry.status)
        .filter((status): status is string => Boolean(status))
    )
  } catch (error) {
    console.error('Asset statuses error:', error)
    return NextResponse.json(
      { error: 'Failed to load asset statuses' },
      { status: 500 }
    )
  }
}
