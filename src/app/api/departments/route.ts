import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const { data: departments, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Departments GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch departments' },
        { status: 500 }
      )
    }

    return NextResponse.json(departments || [])
  } catch (error) {
    console.error('Departments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
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

    const { data: department, error } = await supabaseAdmin
      .from('departments')
      .insert(transformedBody)
      .select()
      .single()

    if (error) {
      console.error('Departments POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create department', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error('Departments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    )
  }
}