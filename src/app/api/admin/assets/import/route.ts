import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ParsedAssetRow {
  noAsset?: string
  name?: string
  serialNo?: string
  brand?: string | null
  model?: string | null
  status?: string | null
  pic?: string | null
  picId?: string | null
  cost?: number | null
  categoryId?: string | null
  siteId?: string | null
  departmentId?: string | null
  notes?: string | null
  purchaseDate?: string | null
}

interface AssetImportIssue {
  row: number
  reason: string
  fields?: string[]
}

const HEADER_MAP: Record<string, keyof ParsedAssetRow> = {
  noasset: 'noAsset',
  'asset number': 'noAsset',
  'no_asset': 'noAsset',
  name: 'name',
  'asset name': 'name',
  serialno: 'serialNo',
  'serial number': 'serialNo',
  brand: 'brand',
  model: 'model',
  status: 'status',
  pic: 'pic',
  'pic name': 'pic',
  picid: 'picId',
  'pic id': 'picId',
  cost: 'cost',
  notes: 'notes',
  category: 'categoryId',
  categoryid: 'categoryId',
  'category id': 'categoryId',
  site: 'siteId',
  siteid: 'siteId',
  'site id': 'siteId',
  department: 'departmentId',
  departmentid: 'departmentId',
  'department id': 'departmentId',
  purchasedate: 'purchaseDate',
  'purchase date': 'purchaseDate'
}

const STATUS_MAP: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
  retired: 'Retired',
  disposed: 'Disposed',
  lost: 'Lost'
}

const parseCSVLine = (line: string): string[] => {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

const normalizeStatus = (status?: string | null) => {
  if (!status) return 'Active'
  const normalized = status.trim().toLowerCase()
  return STATUS_MAP[normalized] ?? status.trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const text = (await file.text()).replace(/^\uFEFF/, '')
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length)

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }

    const headerCells = parseCSVLine(lines[0]).map(cell =>
      cell.replace(/(^"|"$)/g, '').trim()
    )
    const normalizedHeaders = headerCells.map(header => {
      const key = header.toLowerCase()
      return HEADER_MAP[key] ?? header
    })

    if (
      !normalizedHeaders.some(header => header === 'noAsset') ||
      !normalizedHeaders.some(header => header === 'name')
    ) {
      return NextResponse.json(
        { error: 'CSV must include noAsset and name columns' },
        { status: 400 }
      )
    }

    const totalRows = lines.length - 1
    let imported = 0
    let skipped = 0
    const issues: AssetImportIssue[] = []

    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1
      const rawValues = parseCSVLine(lines[i])

      if (rawValues.every(value => !value || !value.trim())) {
        continue
      }

      const asset: ParsedAssetRow = {}
      const rowIssues: string[] = []
      const issueFields: Set<string> = new Set()

      normalizedHeaders.forEach((header, index) => {
        const rawValue = rawValues[index]
        if (typeof rawValue !== 'string') {
          return
        }

        const value = rawValue.replace(/(^"|"$)/g, '').trim()
        if (!value) {
          return
        }

        switch (header) {
          case 'noAsset':
            asset.noAsset = value
            break
          case 'name':
            asset.name = value
            break
          case 'serialNo':
            asset.serialNo = value
            break
          case 'brand':
            asset.brand = value
            break
          case 'model':
            asset.model = value
            break
          case 'status':
            asset.status = normalizeStatus(value)
            break
          case 'pic':
            asset.pic = value
            break
          case 'picId':
            asset.picId = value
            break
          case 'cost': {
            const normalizedCost = value.replace(/,/g, '')
            const parsedCost = Number(normalizedCost)
            if (Number.isNaN(parsedCost)) {
              rowIssues.push(`Invalid cost value "${value}"`)
              issueFields.add('cost')
            } else {
              asset.cost = parsedCost
            }
            break
          }
          case 'categoryId':
            asset.categoryId = value
            break
          case 'siteId':
            asset.siteId = value
            break
          case 'departmentId':
            asset.departmentId = value
            break
          case 'notes':
            asset.notes = value
            break
          case 'purchaseDate': {
            const parsedDate = new Date(value)
            if (Number.isNaN(parsedDate.getTime())) {
              rowIssues.push(`Invalid purchaseDate "${value}"`)
              issueFields.add('purchaseDate')
            } else {
              asset.purchaseDate = parsedDate.toISOString()
            }
            break
          }
          default:
            break
        }
      })

      const missingFields: string[] = []
      if (!asset.noAsset) missingFields.push('noAsset')
      if (!asset.name) missingFields.push('name')
      if (!asset.pic) missingFields.push('pic')

      if (missingFields.length) {
        rowIssues.push(`Missing required field(s): ${missingFields.join(', ')}`)
        missingFields.forEach(field => issueFields.add(field))
      }

      let parsedPurchaseDate: Date | null = null
      if (asset.purchaseDate) {
        const parsed = new Date(asset.purchaseDate)
        if (Number.isNaN(parsed.getTime())) {
          rowIssues.push('Invalid purchase date format')
          issueFields.add('purchaseDate')
        } else {
          parsedPurchaseDate = parsed
        }
      }

      if (rowIssues.length) {
        skipped++
        issues.push({
          row: rowNumber,
          reason: rowIssues.join('; '),
          fields: Array.from(issueFields)
        })
        continue
      }

      try {
        const existing = await db.asset.findUnique({
          where: { noAsset: asset.noAsset! },
          select: { id: true }
        })

        if (existing) {
          try {
            await db.asset.update({
              where: { id: existing.id },
              data: {
                name: asset.name!,
                status: asset.status || 'Active',
                serialNo: asset.serialNo ?? null,
                brand: asset.brand ?? null,
                model: asset.model ?? null,
                pic: asset.pic ?? null,
                picId: asset.picId ?? null,
                cost: typeof asset.cost === 'number' ? asset.cost : null,
                notes: asset.notes ?? null,
                siteId: asset.siteId ?? null,
                categoryId: asset.categoryId ?? null,
                departmentId: asset.departmentId ?? null,
                purchaseDate: parsedPurchaseDate
              }
            })
          } catch (updateError: any) {
            skipped++
            issues.push({
              row: rowNumber,
              reason: `Failed to update asset: ${updateError?.message ?? 'Unknown error'}`
            })
            continue
          }
        } else {
          try {
            await db.asset.create({
              data: {
                id: randomUUID(),
                name: asset.name!,
                noAsset: asset.noAsset!,
                status: asset.status || 'Active',
                serialNo: asset.serialNo ?? null,
                brand: asset.brand ?? null,
                model: asset.model ?? null,
                pic: asset.pic ?? null,
                picId: asset.picId ?? null,
                cost: typeof asset.cost === 'number' ? asset.cost : null,
                notes: asset.notes ?? null,
                siteId: asset.siteId ?? null,
                categoryId: asset.categoryId ?? null,
                departmentId: asset.departmentId ?? null,
                purchaseDate: parsedPurchaseDate
              }
            })
          } catch (insertError: any) {
            skipped++
            issues.push({
              row: rowNumber,
              reason: `Failed to create asset: ${insertError?.message ?? 'Unknown error'}`
            })
            continue
          }
        }

        imported++
      } catch (error: any) {
        skipped++
        issues.push({
          row: rowNumber,
          reason: error?.message
            ? `Unexpected error: ${error.message}`
            : 'Unexpected error while importing asset'
        })
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: totalRows,
      issues,
      errorMessages: issues.map(issue =>
        issue.row ? `Row ${issue.row}: ${issue.reason}` : issue.reason
      )
    })
  } catch (error) {
    console.error('Error importing assets:', error)
    return NextResponse.json(
      { error: 'Failed to import assets' },
      { status: 500 }
    )
  }
}
