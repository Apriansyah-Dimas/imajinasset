import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    console.log('DEBUG: Attempting to fetch departments with sortOrder')
    const departments = await db.department.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })
    console.log('DEBUG: Successfully fetched departments:', departments.length, 'records')
    console.log('DEBUG: Sample department structure:', departments[0] ? Object.keys(departments[0]) : 'No departments found')

    return NextResponse.json(departments)
  } catch (error) {
    console.error('Departments GET error:', error)
    console.error('DEBUG: Error details:', error instanceof Error ? error.message : String(error))
    console.error('DEBUG: Error code:', (error as any)?.code || 'No code available')
    console.error('DEBUG: Full error:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Failed to fetch departments', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const maxOrder = await db.department.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

    const department = await db.department.create({
      data: {
        id: randomUUID(),
        name: body.name,
        sortOrder: nextOrder,
        description: body.description || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(department)
  } catch (error) {
    console.error('Departments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create department', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id: unknown): id is string => typeof id === 'string') : []

    if (orderedIds.length > 0) {
      const existing = await db.department.findMany({
        select: { id: true },
        orderBy: { sortOrder: 'asc' }
      })

      const existingIds = new Set(existing.map(item => item.id))
      const sanitizedOrder = orderedIds.filter(id => existingIds.has(id))
      if (sanitizedOrder.length === 0) {
        return NextResponse.json(
          { error: 'No valid department ids provided' },
          { status: 400 }
        )
      }

      const remaining = existing
        .map(item => item.id)
        .filter(id => !sanitizedOrder.includes(id))

      const finalOrder = [...sanitizedOrder, ...remaining]
      await db.$transaction(
        finalOrder.map((departmentId, index) =>
          db.department.update({
            where: { id: departmentId },
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

    const current = await db.department.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    const neighbor = await db.department.findFirst({
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
      db.department.update({
        where: { id: current.id },
        data: { sortOrder: neighbor.sortOrder }
      }),
      db.department.update({
        where: { id: neighbor.id },
        data: { sortOrder: current.sortOrder }
      })
    ])

    return NextResponse.json({ success: true, swapped: [current.id, neighbor.id] })
  } catch (error) {
    console.error('Departments PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder departments' },
      { status: 500 }
    )
  }
}
