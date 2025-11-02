import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { confirmAll } = body

    // Require explicit confirmation for deleting all assets
    if (!confirmAll) {
      return NextResponse.json(
        { error: 'Confirmation required. Set confirmAll to true to delete all assets.' },
        { status: 400 }
      )
    }

    // Get count of assets before deletion for response
    const { count: assetsCount, error: countError } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting assets:', countError)
      return NextResponse.json(
        { error: 'Failed to count assets' },
        { status: 500 }
      )
    }

    if (!assetsCount || assetsCount === 0) {
      return NextResponse.json(
        { message: 'No assets found to delete', deletedCount: 0 },
        { status: 200 }
      )
    }

    // Delete all assets
    const { error: deleteError } = await supabaseAdmin
      .from('assets')
      .delete()
      .neq('id', '') // Delete all rows (using a condition that's always true)

    if (deleteError) {
      console.error('Error deleting all assets:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assets', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${assetsCount} assets`,
      deletedCount: assetsCount
    })

  } catch (error) {
    console.error('Bulk delete assets error:', error)
    return NextResponse.json(
      { error: 'Failed to delete assets', details: error.message },
      { status: 500 }
    )
  }
}