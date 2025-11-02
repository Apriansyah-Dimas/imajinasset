import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'

const preferPrismaEngine = () => {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) return false
  const normalized = url.toLowerCase()
  return normalized.startsWith('file:') || normalized.includes('sqlite')
}

const canUseSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

const mapSupabaseAsset = (row: Record<string, any>) => {
  const pickField = (source: Record<string, any>, ...keys: string[]) => {
    for (const key of keys) {
      if (source && source[key] !== undefined) return source[key]
    }
    return undefined
  }

  const pickRelation = (relation: any) => {
    if (!relation) return null
    if (Array.isArray(relation)) {
      return relation.length ? relation[0] : null
    }
    return relation
  }

  const site = pickRelation(row.site ?? row.sites)
  const category = pickRelation(row.category ?? row.categories)
  const department = pickRelation(row.department ?? row.departments)
  const employee = pickRelation(row.employee ?? row.employees)

  const costRaw = pickField(row, 'cost')

  return {
    id: pickField(row, 'id'),
    name: pickField(row, 'name'),
    noAsset: pickField(row, 'noAsset', 'no_asset'),
    status: pickField(row, 'status'),
    serialNo: pickField(row, 'serialNo', 'serial_no') ?? null,
    purchaseDate: pickField(row, 'purchaseDate', 'purchase_date') ?? null,
    cost: costRaw !== undefined && costRaw !== null ? Number(costRaw) : null,
    brand: pickField(row, 'brand') ?? null,
    model: pickField(row, 'model') ?? null,
    siteId: pickField(row, 'siteId', 'site_id') ?? null,
    categoryId: pickField(row, 'categoryId', 'category_id') ?? null,
    departmentId: pickField(row, 'departmentId', 'department_id') ?? null,
    picId: pickField(row, 'picId', 'pic_id') ?? null,
    pic: pickField(row, 'pic') ?? null,
    imageUrl: pickField(row, 'imageUrl', 'image_url') ?? null,
    notes: pickField(row, 'notes') ?? null,
    dateCreated: pickField(row, 'dateCreated', 'date_created') ?? null,
    createdAt: pickField(row, 'createdAt', 'created_at') ?? null,
    updatedAt: pickField(row, 'updatedAt', 'updated_at') ?? null,
    site: site
      ? {
          id: pickField(site, 'id'),
          name: pickField(site, 'name')
        }
      : null,
    category: category
      ? {
          id: pickField(category, 'id'),
          name: pickField(category, 'name')
        }
      : null,
    department: department
      ? {
          id: pickField(department, 'id'),
          name: pickField(department, 'name')
        }
      : null,
    employee: employee
      ? {
          id: pickField(employee, 'id'),
          employeeId: pickField(employee, 'employeeId', 'employee_id'),
          name: pickField(employee, 'name'),
          email: pickField(employee, 'email'),
          department: pickField(employee, 'department'),
          position: pickField(employee, 'position'),
          isActive: pickField(employee, 'isActive', 'is_active')
        }
      : null
  }
}

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

    const preferPrisma = preferPrismaEngine()
    const supabaseAvailable = canUseSupabase()

    if (!preferPrisma && supabaseAvailable) {
      const { data: assetRows, error } = await supabaseAdmin
        .from('assets')
        .select('*')

      if (error) {
        console.error('Supabase assets GET error:', error)
        throw error
      }

      const rows = Array.isArray(assetRows) ? assetRows : []

      const matchesId = (rowValue: any, target?: string | null) => {
        if (!target) return true
        return rowValue === target
      }

      const getField = (row: Record<string, any>, ...keys: string[]) => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null) return row[key]
        }
        return null
      }

      let filtered = rows.filter(row => {
        if (!matchesId(row.picId ?? row.pic_id, picId)) return false
        if (!matchesId(row.categoryId ?? row.category_id, categoryId)) return false
        if (!matchesId(row.siteId ?? row.site_id, siteId)) return false
        if (!matchesId(row.departmentId ?? row.department_id, departmentId)) return false
        return true
      })

      if (search) {
        const token = search.trim().toLowerCase()
        if (token) {
          filtered = filtered.filter(row => {
            const values = [
              row.name,
              row.noAsset ?? row.no_asset,
              row.status,
              row.serialNo ?? row.serial_no,
              row.brand,
              row.model,
              row.notes,
              row.pic,
              row.picId ?? row.pic_id
            ]
            return values.some(value =>
              value && String(value).toLowerCase().includes(token)
            )
          })
        }
      }

      const sortKey = (row: Record<string, any>) => {
        const value =
          getField(row, 'createdAt', 'created_at', 'createdat') ||
          getField(row, 'dateCreated', 'date_created', 'datecreated') ||
          getField(row, 'updatedAt', 'updated_at', 'updatedat')
        return value ? new Date(value).getTime() : 0
      }

      filtered.sort((a, b) => sortKey(b) - sortKey(a))

      const total = filtered.length
      const start = Math.max((page - 1) * limit, 0)
      const end = limit > 0 ? start + limit : filtered.length
      const paginated = filtered.slice(start, end)

      const uniqueIds = (rows: typeof paginated, keyVariants: string[]) => {
        const ids = new Set<string>()
        for (const row of rows) {
          for (const key of keyVariants) {
            const id = row[key]
            if (typeof id === 'string' && id.trim()) {
              ids.add(id)
              break
            }
          }
        }
        return Array.from(ids)
      }

      const siteIds = uniqueIds(paginated, ['siteId', 'site_id'])
      const categoryIds = uniqueIds(paginated, ['categoryId', 'category_id'])
      const departmentIds = uniqueIds(paginated, ['departmentId', 'department_id'])
      const employeeIds = uniqueIds(paginated, ['picId', 'pic_id'])

      const fetchRows = async <T>(promise: Promise<{ data: T[] | null; error: any }>) => {
        const { data, error } = await promise
        if (error) {
          console.warn('Supabase relation fetch error:', error)
          return [] as T[]
        }
        return (data ?? []) as T[]
      }

      const [siteRows, categoryRows, departmentRows, employeeRows] = await Promise.all([
        siteIds.length
          ? fetchRows(supabaseAdmin.from('sites').select('id, name').in('id', siteIds))
          : Promise.resolve([]),
        categoryIds.length
          ? fetchRows(supabaseAdmin.from('categories').select('id, name').in('id', categoryIds))
          : Promise.resolve([]),
        departmentIds.length
          ? fetchRows(supabaseAdmin.from('departments').select('id, name').in('id', departmentIds))
          : Promise.resolve([]),
        employeeIds.length
          ? fetchRows(
              supabaseAdmin
                .from('employees')
                .select('id, employeeId, name, email, department, position, isActive')
                .in('id', employeeIds)
            )
          : Promise.resolve([])
      ])

      const toMap = (rows: any[]) => {
        const map = new Map<string, any>()
        for (const row of rows) {
          if (row?.id) {
            map.set(row.id, row)
          }
        }
        return map
      }

      const siteMap = toMap(siteRows)
      const categoryMap = toMap(categoryRows)
      const departmentMap = toMap(departmentRows)
      const employeeMap = toMap(employeeRows)

      const mappedAssets = paginated.map(row => {
        const siteIdValue = row.siteId ?? row.site_id ?? null
        const categoryIdValue = row.categoryId ?? row.category_id ?? null
        const departmentIdValue = row.departmentId ?? row.department_id ?? null
        const employeeIdValue = row.picId ?? row.pic_id ?? null

        return {
          id: row.id,
          name: row.name,
          noAsset: row.noAsset ?? row.no_asset ?? '',
          status: row.status,
          serialNo: row.serialNo ?? row.serial_no ?? null,
          purchaseDate: row.purchaseDate ?? row.purchase_date ?? null,
          cost: row.cost !== undefined && row.cost !== null ? Number(row.cost) : null,
          brand: row.brand ?? null,
          model: row.model ?? null,
          siteId: siteIdValue,
          categoryId: categoryIdValue,
          departmentId: departmentIdValue,
          picId: employeeIdValue,
          pic: row.pic ?? null,
          imageUrl: row.imageUrl ?? row.image_url ?? null,
          notes: row.notes ?? null,
          dateCreated: row.dateCreated ?? row.date_created ?? null,
          createdAt: row.createdAt ?? row.created_at ?? null,
          updatedAt: row.updatedAt ?? row.updated_at ?? null,
          site: siteIdValue ? siteMap.get(siteIdValue) ?? null : null,
          category: categoryIdValue ? categoryMap.get(categoryIdValue) ?? null : null,
          department: departmentIdValue ? departmentMap.get(departmentIdValue) ?? null : null,
          employee: employeeIdValue ? employeeMap.get(employeeIdValue) ?? null : null
        }
      })

      const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1

      return NextResponse.json({
        assets: mappedAssets,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    }

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
        employee: { select: { id: true, name: true } }
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

    const preferPrisma = preferPrismaEngine()
    const supabaseAvailable = canUseSupabase()

    if (!preferPrisma && supabaseAvailable) {
      const timestamp = new Date().toISOString()
      const payload = {
        name: body.name,
        noAsset: body.noAsset,
        status: body.status,
        serialNo: body.serialNo ?? null,
        purchaseDate: body.purchaseDate ?? null,
        cost: body.cost !== undefined && body.cost !== null ? Number(body.cost) : null,
        brand: body.brand ?? null,
        model: body.model ?? null,
        pic: body.pic ?? null,
        imageUrl: body.imageUrl ?? null,
        notes: body.notes ?? null,
        siteId: body.siteId ?? null,
        categoryId: body.categoryId ?? null,
        departmentId: body.departmentId ?? null,
        picId: body.picId ?? null,
        dateCreated: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      const { data, error } = await supabaseAdmin
        .from('assets')
        .insert(payload)
        .select(SUPABASE_SELECT)
        .single()

      if (error) {
        console.error('Supabase assets POST error:', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        asset: mapSupabaseAsset(data)
      })
    }

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
        employee: { select: { id: true, name: true } }
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
