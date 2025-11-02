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
      address: body.address || null,
      city: body.city || null,
      province: body.province || null,
      postal_code: body.postalCode || null,
      country: body.country || null,
      phone: body.phone || null,
      email: body.email || null,
      updatedat: new Date().toISOString()
    }

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .update(transformedBody)
      .eq('id', id)
      .select()
      .single()

    if (error || !site) {
      console.error('Site PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update site' },
        { status: 500 }
      )
    }

    return NextResponse.json(site)
  } catch (error) {
    console.error('Site PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if site is being used by any assets
    const { id } = await params

    const { count: assetsCount, error: countError } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', id)

    if (countError) {
      console.error('Error checking site usage:', countError)
      return NextResponse.json(
        { error: 'Failed to check site usage' },
        { status: 500 }
      )
    }

    if (assetsCount && assetsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete site: it is being used by assets' },
        { status: 400 }
      )
    }

    // Delete the site
    const { error: deleteError } = await supabaseAdmin
      .from('sites')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Site DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete site' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Site DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 }
    )
  }
}