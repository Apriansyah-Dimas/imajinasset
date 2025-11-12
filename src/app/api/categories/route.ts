import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    console.log('DEBUG: Attempting to fetch categories with sortOrder')
    const categories = await db.category.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })
    console.log('DEBUG: Successfully fetched categories:', categories.length, 'records')
    console.log('DEBUG: Sample category structure:', categories[0] ? Object.keys(categories[0]) : 'No categories found')

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories GET error:', error)
    console.error('DEBUG: Error details:', error instanceof Error ? error.message : String(error))
    console.error('DEBUG: Error code:', (error as any)?.code || 'No code available')
    console.error('DEBUG: Full error:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const maxOrder = await db.category.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

    const category = await db.category.create({
      data: {
        id: randomUUID(),
        name: body.name,
        sortOrder: nextOrder,
        description: body.description || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create category', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id: unknown): id is string => typeof id === 'string') : []

    if (orderedIds.length > 0) {
      const existing = await db.category.findMany({
        select: { id: true },
        orderBy: { sortOrder: 'asc' }
      })

      const existingIds = new Set(existing.map(item => item.id))
      const sanitizedOrder = orderedIds.filter(id => existingIds.has(id))
      if (sanitizedOrder.length === 0) {
        return NextResponse.json(
          { error: 'No valid category ids provided' },
          { status: 400 }
        )
      }

      const remaining = existing
        .map(item => item.id)
        .filter(id => !sanitizedOrder.includes(id))

      const finalOrder = [...sanitizedOrder, ...remaining]
      await db.$transaction(
        finalOrder.map((categoryId, index) =>
          db.category.update({
            where: { id: categoryId },
            data: { sortOrder: index }
          })
        )
      )

      return NextResponse.json({ success: true, reordered: finalOrder.length })
    }

    const { id, direction } = body as { id?: string; direction?: 'up' | 'down' }

    if (!id || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json(
        { error: 'Invalid reorder payload' },
        { status: 400 }
      )
    }

    const current = await db.category.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const neighbor = await db.category.findFirst({
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
      db.category.update({
        where: { id: current.id },
        data: { sortOrder: neighbor.sortOrder }
      }),
      db.category.update({
        where: { id: neighbor.id },
        data: { sortOrder: current.sortOrder }
      })
    ])

    return NextResponse.json({ success: true, swapped: [current.id, neighbor.id] })
  } catch (error) {
    console.error('Categories PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    )
  }
}
