import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

const mapUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isActive: user.isActive ?? user.isactive,
  createdAt: user.createdAt ?? user.createdat,
  updatedAt: user.updatedAt ?? user.updatedat,
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

    const skip = (page - 1) * limit

    const where: Prisma.UserWhereInput = {}

    if (role && role !== 'all') {
      where.role = role
    }

    if (search) {
      const trimmed = search.trim()
      if (trimmed) {
        where.OR = [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { email: { contains: trimmed, mode: 'insensitive' } }
        ]
      }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { name: true } }
        }
      }),
      db.user.count({ where })
    ])

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1

    return NextResponse.json({
      users: users.map(mapUser),
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

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        isActive: true
      }
    })

    if (!newUser) {
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
