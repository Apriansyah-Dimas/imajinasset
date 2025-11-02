import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

const mapUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isActive: user.isactive,
  createdAt: user.createdat,
  updatedAt: user.updatedat,
  creator: user.creator ? { name: user.creator.name } : undefined
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limitParam = parseInt(searchParams.get('limit') || '10', 10)
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabaseAdmin
      .from('users')
      .select(
        `
          id,
          email,
          name,
          role,
          isactive,
          createdat,
          updatedat,
          createdby,
          creator:createdby (
            name
          )
        `,
        { count: 'exact' }
      )

    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    if (search) {
      const trimmed = search.trim()
      if (trimmed) {
        const pattern = `%${trimmed
          .replace(/[%_]/g, (char) => `\\${char}`)
          .replace(/,/g, '\\,')}%`

        query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`)
      }
    }

    const { data, error, count } = await query
      .order('createdat', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Supabase error fetching users:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch users',
          details: error.message
        },
        { status: 500 }
      )
    }

    const users = (data ?? []).map(mapUser)
    const total = count ?? 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password, role = 'VIEWER' } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    const validRoles = ['ADMIN', 'SO_ASSET_USER', 'VIEWER']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, SO_ASSET_USER, or VIEWER' },
        { status: 400 }
      )
    }

    const { data: existingUser, error: existingError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing user:', existingError)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        name,
        password: hashedPassword,
        role,
        isactive: true
      })
      .select(
        `
          id,
          email,
          name,
          role,
          isactive,
          createdat,
          updatedat
        `
      )
      .single()

    if (createError || !newUser) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json(mapUser(newUser), { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
