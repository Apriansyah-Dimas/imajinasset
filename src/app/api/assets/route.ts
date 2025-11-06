import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const picId = searchParams.get('picId')
    const categoryId = searchParams.get('categoryId')
    const siteId = searchParams.get('siteId')
    const departmentId = searchParams.get('departmentId')
    const search = searchParams.get('search')

    const where: any = {}
    if (picId) where.picId = picId
    if (categoryId) where.categoryId = categoryId
    if (siteId) where.siteId = siteId
    if (departmentId) where.departmentId = departmentId

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { noAsset: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } }
      ]
    }

    const totalCount = await db.asset.count({ where })
    const skip = (page - 1) * limit
    const assets = await db.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        site: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        employee: { select: { id: true, employeeId: true, name: true } }
      }
    })
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      assets,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const asset = await db.asset.create({
      data: {
        name: body.name,
        noAsset: body.noAsset,
        status: body.status,
        serialNo: body.serialNo || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        cost: body.cost ? parseFloat(body.cost) : null,
        brand: body.brand || null,
        model: body.model || null,
        pic: body.pic || null,
        imageUrl: body.imageUrl || null,
        notes: body.notes || null,
        siteId: body.siteId || null,
        categoryId: body.categoryId || null,
        departmentId: body.departmentId || null,
        picId: body.picId || null
      },
      include: {
        site: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        employee: { select: { id: true, employeeId: true, name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      asset
    })
  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
