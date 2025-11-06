import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const department = await db.department.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null
      }
    })

    if (!department) {
      console.error('Department PUT error: department not found')
      return NextResponse.json(
        { error: 'Failed to update department' },
        { status: 500 }
      )
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error('Department PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if department is being used by any assets
    const { id } = await params

    const assetsCount = await db.asset.count({
      where: { departmentId: id }
    })

    if (assetsCount && assetsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department: it is being used by assets' },
        { status: 400 }
      )
    }

    try {
      await db.department.delete({
        where: { id }
      })
    } catch (deleteError) {
      console.error('Department DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete department' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Department DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    )
  }
}
