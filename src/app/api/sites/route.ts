import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const { data: sites, error } = await supabaseAdmin
      .from('sites')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Sites GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sites' },
        { status: 500 }
      )
    }

    return NextResponse.json(sites || [])
  } catch (error) {
    console.error('Sites GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const transformedBody = {
      id: randomUUID(),
      name: body.name,
      address: body.address || null,
      city: body.city || null,
      province: body.province || null,
      postal_code: body.postalCode || null,
      country: body.country || null,
      phone: body.phone || null,
      email: body.email || null,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    }

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .insert(transformedBody)
      .select()
      .single()

    if (error) {
      console.error('Sites POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create site', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(site)
  } catch (error) {
    console.error('Sites POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    )
  }
}