import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const category = await db.category.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null
      }
    })

    if (!category) {
      console.error('Category PUT error: category not found')
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Category PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if category is being used by any assets
    const { id } = await params

    const assetsCount = await db.asset.count({
      where: { categoryId: id }
    })

    if (assetsCount && assetsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category: it is being used by assets' },
        { status: 400 }
      )
    }

    try {
      await db.category.delete({
        where: { id }
      })
    } catch (deleteError) {
      console.error('Category DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
