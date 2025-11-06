import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    const formatted = employees.map(employee => ({
      id: employee.id,
      name: `${employee.name} (${employee.employeeId})`,
      employeeId: employee.employeeId,
      email: employee.email,
      department: employee.department ?? null,
      position: employee.position ?? null,
      type: 'employee',
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Pics GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PIC options' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'PICs are managed via Employee Management' },
    { status: 405 }
  )
}
