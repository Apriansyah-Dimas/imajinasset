import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Categories GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json(categories || [])
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
      description: body.description || null,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    }

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert(transformedBody)
      .select()
      .single()

    if (error) {
      console.error('Categories POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create category', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}