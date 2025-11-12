import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Employee } from '@prisma/client'

const formatPicResponse = (employee: Employee) => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  department: employee.department ?? null,
  position: employee.position ?? null,
  type: 'employee',
})

const generateEmployeeIdentifier = (name: string) => {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const base = sanitized.slice(0, 6) || 'PIC'
  const random = Math.random().toString(36).toUpperCase().slice(-4)
  return `PIC-${base}-${random}`
}

const ensureUniqueEmployeeId = async (candidate: string) => {
  let normalized = candidate.replace(/\s+/g, '').toUpperCase()
  if (!normalized) {
    normalized = generateEmployeeIdentifier('PIC')
  }

  let attempt = normalized
  let suffix = 1

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await db.employee.findUnique({
      where: { employeeId: attempt }
    })

    if (!exists) return attempt

    attempt = `${normalized}-${suffix}`
    suffix += 1
  }
}

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(employees.map(formatPicResponse))
  } catch (error) {
    console.error('Pics GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PIC options' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json(
        { error: 'PIC name is required' },
        { status: 400 }
      )
    }

    const requestedEmployeeId =
      typeof body.employeeId === 'string' && body.employeeId.trim().length > 0
        ? body.employeeId.trim()
        : generateEmployeeIdentifier(name)

    const uniqueEmployeeId = await ensureUniqueEmployeeId(requestedEmployeeId)

    const employee = await db.employee.create({
      data: {
        employeeId: uniqueEmployeeId,
        name,
        email: null,
        department: null,
        position: null,
        joinDate: null,
        isActive: true,
      }
    })

    return NextResponse.json(formatPicResponse(employee))
  } catch (error) {
    console.error('Pics POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create PIC' },
      { status: 500 }
    )
  }
}
