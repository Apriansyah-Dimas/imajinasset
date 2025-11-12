import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'PIC id is required' },
        { status: 400 }
      )
    }

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'PIC not found' },
        { status: 404 }
      )
    }

    await db.$transaction([
      db.asset.updateMany({
        where: { picId: id },
        data: { picId: null }
      }),
      db.employee.delete({
        where: { id }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Pics DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete PIC' },
      { status: 500 }
    )
  }
}
