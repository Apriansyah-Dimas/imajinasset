import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const sites = await db.site.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(sites)
  } catch (error) {
    console.error('Sites GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const site = await db.site.create({
      data: {
        id: randomUUID(),
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        province: body.province || null,
        postalCode: body.postalCode || null,
        country: body.country || 'Indonesia',
        phone: body.phone || null,
        email: body.email || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(site)
  } catch (error) {
    console.error('Sites POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create site', details: error.message },
      { status: 500 }
    )
  }
}