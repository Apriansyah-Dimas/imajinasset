import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Employees GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const employee = await db.employee.create({
      data: {
        employeeId: body.employeeId,
        name: body.name,
        email: body.email || null,
        department: body.department || null,
        position: body.position || null,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        isActive: true
      }
    })

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Employees POST error:', error)
    const message = error?.message ?? 'Failed to create employee'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
