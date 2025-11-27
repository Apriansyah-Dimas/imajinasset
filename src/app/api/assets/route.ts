import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

const MAX_DB_RETRIES = 3
const RETRY_DELAY_MS = 120

async function retryOnBusy<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const message = (error as Error)?.message?.toLowerCase() ?? ''
      const isBusy =
        message.includes('database is locked') ||
        message.includes('database is busy') ||
        message.includes('busy:')

      if (!isBusy || attempt === MAX_DB_RETRIES) {
        throw error
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      )
    }
  }

  throw lastError
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10)
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
    const limit = Number.isNaN(rawLimit)
      ? 10
      : Math.min(Math.max(rawLimit, 1), 200)

    const picId = searchParams.get('picId')
    const categoryId = searchParams.get('categoryId')
    const siteId = searchParams.get('siteId')
    const departmentId = searchParams.get('departmentId')
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status')
    const categoryName = searchParams.get('category')
    const siteName = searchParams.get('site')
    const departmentName = searchParams.get('department')
    const sortParam = (searchParams.get('sort') || 'dateCreated').toLowerCase()
    const orderParam = (searchParams.get('order') || 'desc').toLowerCase()

    const where: Prisma.AssetWhereInput = {}
    if (picId) where.picId = picId
    if (categoryId) where.categoryId = categoryId
    if (siteId) where.siteId = siteId
    if (departmentId) where.departmentId = departmentId
    if (status) {
      where.status = { equals: status }
    }
    if (categoryName) {
      where.category = {
        is: {
          name: {
            equals: categoryName
          }
        }
      }
    }
    if (siteName) {
      where.site = {
        is: {
          name: {
            equals: siteName
          }
        }
      }
    }
    if (departmentName) {
      where.department = {
        is: {
          name: {
            equals: departmentName
          }
        }
      }
    }

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { name: { contains: search } },
        { noAsset: { contains: search } },
        { status: { contains: search } },
        { serialNo: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { pic: { contains: search } },
        { notes: { contains: search } },
        {
          site: {
            is: {
              name: { contains: search }
            }
          }
        },
        {
          category: {
            is: {
              name: { contains: search }
            }
          }
        },
        {
          department: {
            is: {
              name: { contains: search }
            }
          }
        },
        {
          employee: {
            is: {
              OR: [
                { name: { contains: search } },
                { employeeId: { contains: search } },
                { email: { contains: search } },
                { department: { contains: search } },
                { position: { contains: search } }
              ]
            }
          }
        }
      ]
    }

    const totalCount = await retryOnBusy(() => db.asset.count({ where }))
    const skip = (page - 1) * limit

    const sortField = sortParam === 'name' ? 'name' : 'dateCreated'
    const sortOrder: Prisma.SortOrder = orderParam === 'asc' ? 'asc' : 'desc'
    const orderBy: Prisma.AssetOrderByWithRelationInput =
      sortField === 'name'
        ? { name: sortOrder }
        : { dateCreated: sortOrder }

    const assets = await retryOnBusy(() =>
      db.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          site: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          employee: { select: { id: true, employeeId: true, name: true } }
        }
      })
    )
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
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
