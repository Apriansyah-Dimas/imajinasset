import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const transformedBody = {
      name: body.name,
      description: body.description || null,
      updatedat: new Date().toISOString()
    }

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .update(transformedBody)
      .eq('id', id)
      .select()
      .single()

    if (error || !category) {
      console.error('Category PUT error:', error)
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

    const { count: assetsCount, error: countError } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)

    if (countError) {
      console.error('Error checking category usage:', countError)
      return NextResponse.json(
        { error: 'Failed to check category usage' },
        { status: 500 }
      )
    }

    if (assetsCount && assetsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category: it is being used by assets' },
        { status: 400 }
      )
    }

    // Delete the category
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
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