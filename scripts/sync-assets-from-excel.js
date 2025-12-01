// Sync assets from Excel "Asset Management Database.xlsx" (sheet: List of Assets) into the DB
// Usage: node scripts/sync-assets-from-excel.js

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const WORKBOOK_PATH = path.join(__dirname, '..', 'Asset Management Database.xlsx')
const SHEET_NAME = 'List of Assets'
const TMP_TSV_PATH = path.join(os.tmpdir(), `assets-sync-${Date.now()}.tsv`)

const monthMap = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

const lookupCaches = {
  sites: new Map(),
  departments: new Map(),
  categories: new Map(),
  employees: new Map(),
}

const createdLookups = {
  sites: new Set(),
  departments: new Set(),
  categories: new Set(),
}

const safeTrim = (value) =>
  typeof value === 'string' ? value.trim().replace(/\uFEFF/g, '') : ''

const normalizeKey = (value) =>
  safeTrim(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')

const normalizeAssetCode = (value) =>
  safeTrim(value)
    .replace(/\s+/g, '')
    .toUpperCase()

const parsePurchaseDate = (value) => {
  const trimmed = safeTrim(value)
  if (!trimmed) return null

  const parts = trimmed.split(/[-/]/).filter(Boolean)
  if (parts.length < 3) return null

  // Excel export sometimes emits dates as dd-MMM-yy
  const day = Number(parts[0])
  const month = monthMap[parts[1].slice(0, 3).toLowerCase()]
  let year = Number(parts[2])

  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) {
    return null
  }

  if (year < 100) {
    year += year >= 90 ? 1900 : 2000
  }

  const date = new Date(Date.UTC(year, month, day))
  return Number.isNaN(date.getTime()) ? null : date
}

const parseCurrency = (value) => {
  const trimmed = safeTrim(value)
  if (!trimmed) return null

  let sanitized = trimmed.replace(/[^0-9,.-]/g, '')
  if (!sanitized) return null

  sanitized = sanitized.replace(/\./g, '')
  const normalized = sanitized.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

const parseStatus = (value) => {
  const trimmed = safeTrim(value).toLowerCase()
  if (!trimmed) return 'Active'
  if (trimmed.includes('broken')) return 'Broken'
  if (trimmed.includes('repair')) return 'Repair'
  if (trimmed.includes('disposed')) return 'Disposed'
  if (trimmed.includes('lost')) return 'Lost/Missing'
  if (trimmed.includes('missing')) return 'Lost/Missing'
  if (trimmed.includes('sell')) return 'Sell'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const runConversion = () => {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Workbook not found at ${WORKBOOK_PATH}`)
  }

  const cmd = `npx -y xlsx-cli --sheet "${SHEET_NAME}" --txt "${WORKBOOK_PATH}" -o "${TMP_TSV_PATH}"`
  execSync(cmd, { stdio: 'inherit' })
  if (!fs.existsSync(TMP_TSV_PATH)) {
    throw new Error('Failed to generate TSV from Excel')
  }
}

const loadRecords = () => {
  runConversion()
  const buffer = fs.readFileSync(TMP_TSV_PATH)
  const text = buffer.toString('utf16le')
  const lines = text.split(/\r?\n/).filter((line) => line.trim())

  let headers = null
  const records = []

  for (const line of lines) {
    const cols = line.split('\t')
    if (!headers) {
      const trimmed = cols.map((c) => c.trim())
      if (trimmed.includes('Asset ID') && trimmed.includes('Asset Name')) {
        headers = trimmed
      }
      continue
    }

    const record = {}
    headers.forEach((h, i) => {
      record[h] = safeTrim(cols[i] ?? '')
    })
    records.push(record)
  }

  if (!headers) {
    throw new Error('Could not locate header row in the exported sheet')
  }

  return records
}

const bootstrapLookups = async () => {
  const [sites, departments, categories, employees] = await Promise.all([
    prisma.site.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.employee.findMany({ select: { id: true, name: true } }),
  ])

  sites.forEach((site) => lookupCaches.sites.set(normalizeKey(site.name), site))
  departments.forEach((dept) =>
    lookupCaches.departments.set(normalizeKey(dept.name), dept)
  )
  categories.forEach((category) =>
    lookupCaches.categories.set(normalizeKey(category.name), category)
  )
  employees.forEach((employee) =>
    lookupCaches.employees.set(normalizeKey(employee.name), employee)
  )
}

const ensureLookup = async (type, name) => {
  const normalized = normalizeKey(name)
  if (!normalized) return null

  const cache = lookupCaches[type]
  if (cache.has(normalized)) return cache.get(normalized)

  const created = await prisma[type.slice(0, -1)].create({
    data: { name: safeTrim(name) },
  })

  cache.set(normalized, created)
  createdLookups[type].add(created.name)
  return created
}

const findEmployeeByName = (name) => {
  const normalized = normalizeKey(name)
  if (!normalized) return null
  return lookupCaches.employees.get(normalized) || null
}

const buildAssetDetails = async (record) => {
  const financeCost = parseCurrency(record['Cost (Finance)'])
  const gaCost = parseCurrency(record['Cost (GA & Supply Chain)'])
  const cost = financeCost ?? gaCost ?? null

  const site = await ensureLookup('sites', record.Site)
  const department = await ensureLookup('departments', record.Department)
  const category = await ensureLookup('categories', record.Category)
  const picName = safeTrim(record.PIC) || null
  const employee = picName ? findEmployeeByName(picName) : null

  return {
    name: safeTrim(record['Asset Name']) || null,
    status: parseStatus(record.Status),
    serialNo: safeTrim(record['Serial Number']) || null,
    purchaseDate: parsePurchaseDate(record['Purchase Date']),
    cost,
    brand: safeTrim(record.Brand) || null,
    model: safeTrim(record.Model) || null,
    notes: safeTrim(record.Notes) || null,
    siteId: site?.id ?? null,
    categoryId: category?.id ?? null,
    departmentId: department?.id ?? null,
    pic: picName,
    picId: employee?.id ?? null,
  }
}

const syncAssets = async () => {
  const records = loadRecords()
  await bootstrapLookups()

  const existingAssets = await prisma.asset.findMany({
    select: {
      id: true,
      noAsset: true,
      name: true,
      status: true,
      serialNo: true,
      purchaseDate: true,
      cost: true,
      brand: true,
      model: true,
      notes: true,
      siteId: true,
      categoryId: true,
      departmentId: true,
      pic: true,
      picId: true,
    },
  })

  const assetMap = new Map(
    existingAssets.map((asset) => [normalizeAssetCode(asset.noAsset), asset])
  )

  const summary = {
    totalRows: records.length,
    processed: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skippedInvalidCode: 0,
    skippedMissingKey: 0,
    skippedDuplicates: 0,
    errors: 0,
  }

  const seenAssetCodes = new Set()

  for (const record of records) {
    const assetNumber = safeTrim(record['Asset ID'])
    const assetCode = normalizeAssetCode(assetNumber)

    // Only process FA assets
    if (!assetNumber || !assetCode.startsWith('FA')) {
      summary.skippedInvalidCode += 1
      continue
    }

    if (seenAssetCodes.has(assetCode)) {
      summary.skippedDuplicates += 1
      continue
    }
    seenAssetCodes.add(assetCode)

    const details = await buildAssetDetails(record)
    if (!details.name) {
      summary.skippedMissingKey += 1
      continue
    }

    const existing = assetMap.get(assetCode)

    try {
      if (!existing) {
        const createdAsset = await prisma.asset.create({
          data: {
            name: details.name,
            noAsset: assetNumber,
            status: details.status,
            serialNo: details.serialNo,
            purchaseDate: details.purchaseDate,
            cost: details.cost,
            brand: details.brand,
            model: details.model,
            notes: details.notes,
            siteId: details.siteId,
            categoryId: details.categoryId,
            departmentId: details.departmentId,
            pic: details.pic,
            picId: details.picId,
          },
        })
        assetMap.set(assetCode, createdAsset)
        summary.created += 1
        summary.processed += 1
        console.log(`Created asset ${assetNumber} (${details.name})`)
      } else {
        const updateData = {}
        const updatedFields = []

        if (existing.noAsset !== assetNumber) {
          updateData.noAsset = assetNumber
          updatedFields.push('noAsset')
        }
        if (details.name && existing.name !== details.name) {
          updateData.name = details.name
          updatedFields.push('name')
        }
        if (details.status && existing.status !== details.status) {
          updateData.status = details.status
          updatedFields.push('status')
        }
        if (details.serialNo && existing.serialNo !== details.serialNo) {
          updateData.serialNo = details.serialNo
          updatedFields.push('serial number')
        }
        if (
          details.purchaseDate &&
          (!existing.purchaseDate ||
            existing.purchaseDate.getTime() !== details.purchaseDate.getTime())
        ) {
          updateData.purchaseDate = details.purchaseDate
          updatedFields.push('purchase date')
        }
        if (details.cost !== null) {
          const existingCost =
            existing.cost === null || existing.cost === undefined
              ? null
              : Number(existing.cost)
          if (existingCost !== details.cost) {
            updateData.cost = details.cost
            updatedFields.push('cost')
          }
        }
        if (details.brand && existing.brand !== details.brand) {
          updateData.brand = details.brand
          updatedFields.push('brand')
        }
        if (details.model && existing.model !== details.model) {
          updateData.model = details.model
          updatedFields.push('model')
        }
        if (details.notes && existing.notes !== details.notes) {
          updateData.notes = details.notes
          updatedFields.push('notes')
        }
        if (details.siteId && existing.siteId !== details.siteId) {
          updateData.siteId = details.siteId
          updatedFields.push('site')
        }
        if (details.categoryId && existing.categoryId !== details.categoryId) {
          updateData.categoryId = details.categoryId
          updatedFields.push('category')
        }
        if (
          details.departmentId &&
          existing.departmentId !== details.departmentId
        ) {
          updateData.departmentId = details.departmentId
          updatedFields.push('department')
        }
        if (details.pic && (!existing.pic || existing.pic !== details.pic)) {
          updateData.pic = details.pic
          updatedFields.push('PIC name')
        }
        if (details.picId && existing.picId !== details.picId) {
          updateData.picId = details.picId
          updatedFields.push('PIC link')
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.asset.update({
            where: { id: existing.id },
            data: updateData,
          })
          summary.updated += 1
          summary.processed += 1
          console.log(
            `Updated asset ${assetNumber}: ${updatedFields.join(', ')}`
          )
        } else {
          summary.unchanged += 1
        }
      }
    } catch (error) {
      summary.errors += 1
      console.error(`Failed processing asset ${assetNumber}:`, error.message)
    }
  }

  console.log('--- Sync summary ---')
  console.log(`Rows in sheet: ${summary.totalRows}`)
  console.log(`Created assets: ${summary.created}`)
  console.log(`Updated assets: ${summary.updated}`)
  console.log(`Unchanged: ${summary.unchanged}`)
  console.log(`Skipped invalid code: ${summary.skippedInvalidCode}`)
  console.log(`Skipped missing name: ${summary.skippedMissingKey}`)
  console.log(`Skipped duplicates: ${summary.skippedDuplicates}`)
  console.log(`Errors: ${summary.errors}`)

  if (createdLookups.sites.size) {
    console.log('New sites added:', [...createdLookups.sites].join(', '))
  }
  if (createdLookups.departments.size) {
    console.log('New departments added:', [...createdLookups.departments].join(', '))
  }
  if (createdLookups.categories.size) {
    console.log('New categories added:', [...createdLookups.categories].join(', '))
  }
}

const main = async () => {
  try {
    await syncAssets()
  } finally {
    await prisma.$disconnect()
    if (fs.existsSync(TMP_TSV_PATH)) {
      fs.rmSync(TMP_TSV_PATH, { force: true })
    }
  }
}

main().catch((error) => {
  console.error('Sync failed:', error)
  process.exitCode = 1
})
