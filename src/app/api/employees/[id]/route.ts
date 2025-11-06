import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Employee GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    const resolvedIsActive =
      typeof body.isActive === 'boolean'
        ? body.isActive
        : typeof body.isactive === 'boolean'
          ? body.isactive
          : undefined

    const employee = await db.employee.update({
      where: { id },
      data: {
        employeeId: body.employeeId,
        name: body.name,
        email: body.email || null,
        department: body.department || null,
        position: body.position || null,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        ...(resolvedIsActive !== undefined ? { isActive: resolvedIsActive } : {})
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Failed to update employee' },
        { status: 500 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Employee PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    await db.$transaction([
      db.asset.updateMany({
        where: { picId: id },
        data: { picId: null }
      }),
      db.employee.delete({
        where: { id }
      })
    ])

    return NextResponse.json({ message: 'Employee deleted successfully. Related assets were updated.' })
  } catch (error) {
    console.error('Employee DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
