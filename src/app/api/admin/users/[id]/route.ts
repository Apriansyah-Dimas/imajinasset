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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(mapUser(user))
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      email,
      role,
      password,
      isactive,
      isActive
    } = body

    const validRoles = ['ADMIN', 'SO_ASSET_USER', 'VIEWER']

    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, SO_ASSET_USER, or VIEWER' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (email && email !== existing.email) {
      const emailOwner = await db.user.findUnique({
        where: { email },
        select: { id: true }
      })

      if (emailOwner && emailOwner.id !== id) {
        return NextResponse.json(
          { error: 'Email is already in use by another user' },
          { status: 409 }
        )
      }
    }

    const updateData: Prisma.UserUpdateInput = {}

    if (typeof name === 'string' && name.trim().length) {
      updateData.name = name.trim()
    }

    if (typeof email === 'string' && email.trim().length) {
      updateData.email = email.trim()
    }

    if (typeof role === 'string' && validRoles.includes(role)) {
      updateData.role = role
    }

    const resolvedIsActive =
      typeof isActive === 'boolean'
        ? isActive
        : typeof isactive === 'boolean'
          ? isactive
          : undefined
    if (typeof resolvedIsActive === 'boolean') {
      updateData.isActive = resolvedIsActive
    }

    if (password && typeof password === 'string' && password.trim().length) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { name: true } }
      }
    })

    return NextResponse.json(mapUser(updatedUser))
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'ADMIN') {
      const adminCount = await db.user.count({
        where: { role: 'ADMIN' }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        )
      }
    }

    await db.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
