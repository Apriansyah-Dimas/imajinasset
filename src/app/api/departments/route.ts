import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error('Departments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const department = await db.department.create({
      data: {
        id: randomUUID(),
        name: body.name,
        description: body.description || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(department)
  } catch (error) {
    console.error('Departments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create department', details: error.message },
      { status: 500 }
    )
  }
}