import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    console.log('DEBUG: Attempting to fetch sites with sortOrder')
    const sites = await db.site.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })
    console.log('DEBUG: Successfully fetched sites:', sites.length, 'records')
    console.log('DEBUG: Sample site structure:', sites[0] ? Object.keys(sites[0]) : 'No sites found')

    return NextResponse.json(sites)
  } catch (error) {
    console.error('Sites GET error:', error)
    console.error('DEBUG: Error details:', error instanceof Error ? error.message : String(error))
    console.error('DEBUG: Error code:', (error as any)?.code || 'No code available')
    console.error('DEBUG: Full error:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Failed to fetch sites', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const maxOrder = await db.site.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

    const site = await db.site.create({
      data: {
        id: randomUUID(),
        name: body.name,
        sortOrder: nextOrder,
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
      { error: 'Failed to create site', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, direction } = body as { id?: string; direction?: 'up' | 'down' }

    if (!id || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json(
        { error: 'Invalid reorder payload' },
        { status: 400 }
      )
    }

    const current = await db.site.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    const neighbor = await db.site.findFirst({
      where:
        direction === 'up'
          ? { sortOrder: { lt: current.sortOrder } }
          : { sortOrder: { gt: current.sortOrder } },
      orderBy: {
        sortOrder: direction === 'up' ? 'desc' : 'asc'
      }
    })

    if (!neighbor) {
      return NextResponse.json({ success: true, swapped: [] })
    }

    await db.$transaction([
      db.site.update({
        where: { id: current.id },
        data: { sortOrder: neighbor.sortOrder }
      }),
      db.site.update({
        where: { id: neighbor.id },
        data: { sortOrder: current.sortOrder }
      })
    ])

    return NextResponse.json({ success: true, swapped: [current.id, neighbor.id] })
  } catch (error) {
    console.error('Sites PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder sites' },
      { status: 500 }
    )
  }
}
