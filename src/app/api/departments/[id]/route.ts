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

    const { data: department, error } = await supabaseAdmin
      .from('departments')
      .update(transformedBody)
      .eq('id', id)
      .select()
      .single()

    if (error || !department) {
      console.error('Department PUT error:', error)
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

    const { count: assetsCount, error: countError } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', id)

    if (countError) {
      console.error('Error checking department usage:', countError)
      return NextResponse.json(
        { error: 'Failed to check department usage' },
        { status: 500 }
      )
    }

    if (assetsCount && assetsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department: it is being used by assets' },
        { status: 400 }
      )
    }

    // Delete the department
    const { error: deleteError } = await supabaseAdmin
      .from('departments')
      .delete()
      .eq('id', id)

    if (deleteError) {
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