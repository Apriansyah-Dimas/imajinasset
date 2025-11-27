const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const CSV_PATH = path.join(__dirname, '..', 'Untitled spreadsheet - Sheet1.csv')

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

const acceptedAssetPrefixes = ['FA', 'LAP', 'MON']

const parseCsv = (content) => {
  const rows = []
  let current = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      current.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1
      }
      current.push(value)
      rows.push(current)
      current = []
      value = ''
      continue
    }

    value += char
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value)
    rows.push(current)
  }

  return rows.filter((row) => row.some((cell) => safeTrim(cell).length > 0))
}

const parsePurchaseDate = (value) => {
  const trimmed = safeTrim(value)
  if (!trimmed) return null

  const parts = trimmed.split(/[-/]/).filter(Boolean)
  if (parts.length < 3) return null

  const day = Number(parts[0])
  const month = monthMap[parts[1].slice(0, 3).toLowerCase()]
  let year = Number(parts[2])

  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) {
    return null
  }

  if (year < 100) {
    year += year >= 90 ? 1900 : 2000
  }

  return new Date(Date.UTC(year, month, day))
}

const parseCurrency = (value) => {
  const trimmed = safeTrim(value)
  if (!trimmed) return null

  let sanitized = trimmed.replace(/[^0-9,.-]/g, '')
  if (!sanitized) return null

  sanitized = sanitized.replace(/\./g, '')
  const commaCount = (sanitized.match(/,/g) || []).length

  if (commaCount === 1) {
    const [intPart, decimalPart = ''] = sanitized.split(',')
    if (decimalPart.length <= 2 && intPart.length <= 3) {
      const normalized = `${intPart}.${decimalPart.padEnd(2, '0')}`
      const parsed = Number(normalized)
      return Number.isNaN(parsed) ? null : parsed
    }
  }

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
  if (trimmed.includes('inactive')) return 'Inactive'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const loadRecords = () => {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at ${CSV_PATH}`)
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8')
  const rows = parseCsv(content)
  if (rows.length < 2) {
    throw new Error('CSV file does not contain data rows')
  }

  const headers = rows[0].map((header, index) => {
    const trimmed = safeTrim(header)
    if (!trimmed) {
      return index === 0 ? 'RowNumber' : `H${index}`
    }
    return trimmed
  })

  return rows.slice(1).map((row) => {
    const record = {}
    headers.forEach((header, idx) => {
      record[header] = safeTrim(row[idx] ?? '')
    })
    return record
  })
}

const bootstrapLookups = async () => {
  const [sites, departments, categories, employees] = await Promise.all([
    prisma.site.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.employee.findMany({ select: { id: true, name: true } }),
  ])

  sites.forEach((site) => {
    lookupCaches.sites.set(normalizeKey(site.name), site)
  })
  departments.forEach((dept) => {
    lookupCaches.departments.set(normalizeKey(dept.name), dept)
  })
  categories.forEach((category) => {
    lookupCaches.categories.set(normalizeKey(category.name), category)
  })
  employees.forEach((employee) => {
    lookupCaches.employees.set(normalizeKey(employee.name), employee)
  })
}

const ensureLookup = async (type, name) => {
  const normalized = normalizeKey(name)
  if (!normalized) return null

  const cache = lookupCaches[type]
  if (cache.has(normalized)) {
    return cache.get(normalized)
  }

  let created = null
  if (type === 'sites') {
    created = await prisma.site.create({
      data: { name: safeTrim(name) },
    })
    createdLookups.sites.add(created.name)
  } else if (type === 'departments') {
    created = await prisma.department.create({
      data: { name: safeTrim(name) },
    })
    createdLookups.departments.add(created.name)
  } else if (type === 'categories') {
    created = await prisma.category.create({
      data: {
        name: safeTrim(name),
        description: `Imported from CSV (${safeTrim(name)})`,
      },
    })
    createdLookups.categories.add(created.name)
  }

  if (created) {
    cache.set(normalized, created)
  }

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

const extractAssetCode = (record, assetMap) => {
  const candidates = [record['Asset ID'], record.ID]
  for (const candidate of candidates) {
    const trimmed = safeTrim(candidate)
    if (!trimmed) continue

    const normalized = normalizeAssetCode(trimmed)
    const upperCandidate = trimmed.toUpperCase()
    const matchesPrefix = acceptedAssetPrefixes.some((prefix) =>
      upperCandidate.startsWith(prefix)
    )

    if (matchesPrefix) {
      return normalized
    }

    if (assetMap.has(normalized)) {
      return normalized
    }
  }

  return null
}

const buildAssetMap = (assets) => {
  const assetMap = new Map()
  assets.forEach((asset) => {
    assetMap.set(normalizeAssetCode(asset.noAsset), asset)
  })
  return assetMap
}

const collectCsvAssetCodes = (records, assetMap) => {
  const codes = new Set()
  let invalidRows = 0

  for (const record of records) {
    const code = extractAssetCode(record, assetMap)
    if (code) {
      codes.add(code)
    } else {
      invalidRows += 1
    }
  }

  return { codes, invalidRows }
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

  const assetMap = buildAssetMap(existingAssets)

  const summary = {
    totalRows: records.length,
    processed: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skippedMissingKey: 0,
    skippedInvalidCode: 0,
    skippedDuplicates: 0,
    errors: 0,
  }

  const seenAssetCodes = new Set()

  for (const record of records) {
    const assetCode = extractAssetCode(record, assetMap)

    if (!assetCode) {
      summary.skippedInvalidCode += 1
      console.warn(
        `Skipping row without valid asset code: ${record['Asset Name'] || 'Unnamed'}`
      )
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
            noAsset: assetCode,
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
        console.log(`Created asset ${assetCode} (${details.name})`)
      } else {
        const updateData = {}
        const updatedFields = []

        if (!existing.name && details.name) {
          updateData.name = details.name
          updatedFields.push('name')
        }
        if ((!existing.status || existing.status === 'Unidentified') && details.status) {
          updateData.status = details.status
          updatedFields.push('status')
        }
        if (!existing.serialNo && details.serialNo) {
          updateData.serialNo = details.serialNo
          updatedFields.push('serial number')
        }
        if (!existing.purchaseDate && details.purchaseDate) {
          updateData.purchaseDate = details.purchaseDate
          updatedFields.push('purchase date')
        }
        if (details.cost !== null) {
          const existingCostValue =
            existing.cost === null || existing.cost === undefined
              ? null
              : existing.cost.toString()
          const incomingCostValue = details.cost.toString()
          if (existingCostValue !== incomingCostValue) {
            updateData.cost = details.cost
            updatedFields.push(
              existingCostValue === null ? 'cost' : 'cost (updated value)'
            )
          }
        }
        if (!existing.brand && details.brand) {
          updateData.brand = details.brand
          updatedFields.push('brand')
        }
        if (!existing.model && details.model) {
          updateData.model = details.model
          updatedFields.push('model')
        }
        if (!existing.notes && details.notes) {
          updateData.notes = details.notes
          updatedFields.push('notes')
        }
        if (!existing.siteId && details.siteId) {
          updateData.siteId = details.siteId
          updatedFields.push('site')
        }
        if (!existing.categoryId && details.categoryId) {
          updateData.categoryId = details.categoryId
          updatedFields.push('category')
        }
        if (!existing.departmentId && details.departmentId) {
          updateData.departmentId = details.departmentId
          updatedFields.push('department')
        }
        if ((!existing.pic || !safeTrim(existing.pic)) && details.pic) {
          updateData.pic = details.pic
          updatedFields.push('PIC name')
        }
        if (!existing.picId && details.picId) {
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
          console.log(`Updated asset ${assetCode}: added ${updatedFields.join(', ')}`)
        } else {
          summary.unchanged += 1
        }
      }
    } catch (error) {
      summary.errors += 1
      console.error(`Failed processing asset ${assetCode}:`, error.message)
    }
  }

  console.log('--- Import summary ---')
  console.log(`Rows in CSV: ${summary.totalRows}`)
  console.log(`Created assets: ${summary.created}`)
  console.log(`Updated assets: ${summary.updated}`)
  console.log(`Already complete: ${summary.unchanged}`)
  console.log(`Skipped (missing key/name): ${summary.skippedMissingKey}`)
  console.log(`Skipped (invalid asset code): ${summary.skippedInvalidCode}`)
  console.log(`Skipped duplicates: ${summary.skippedDuplicates}`)
  console.log(`Errors: ${summary.errors}`)

  if (createdLookups.sites.size > 0) {
    console.log(`New sites added: ${Array.from(createdLookups.sites).join(', ')}`)
  }
  if (createdLookups.departments.size > 0) {
    console.log(`New departments added: ${Array.from(createdLookups.departments).join(', ')}`)
  }
  if (createdLookups.categories.size > 0) {
    console.log(`New categories added: ${Array.from(createdLookups.categories).join(', ')}`)
  }
}

const chunkArray = (arr, size) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const deleteMissingAssets = async () => {
  const records = loadRecords()
  const existingAssets = await prisma.asset.findMany({
    select: { id: true, noAsset: true, name: true },
  })

  if (existingAssets.length === 0) {
    console.log('No assets found in database. Nothing to delete.')
    return
  }

  const assetMap = buildAssetMap(existingAssets)
  const { codes: csvCodes, invalidRows } = collectCsvAssetCodes(records, assetMap)

  const assetsToDelete = existingAssets.filter(
    (asset) => !csvCodes.has(normalizeAssetCode(asset.noAsset))
  )

  console.log(`Assets in DB: ${existingAssets.length}`)
  console.log(`Unique asset codes in CSV: ${csvCodes.size}`)
  console.log(`Rows without valid asset code: ${invalidRows}`)
  console.log(`Assets to delete: ${assetsToDelete.length}`)

  if (assetsToDelete.length === 0) {
    console.log('All assets already exist in the spreadsheet. No deletions performed.')
    return
  }

  const assetIds = assetsToDelete.map((asset) => asset.id)
  const assetCodes = assetsToDelete.map((asset) => asset.noAsset)
  const chunkSize = 100

  console.log('Deleting related SO asset entries, checkouts, and events...')
  for (const chunk of chunkArray(assetIds, chunkSize)) {
    await prisma.assetEvent.deleteMany({
      where: { assetId: { in: chunk } },
    })
    await prisma.sOAssetEntry.deleteMany({
      where: { assetId: { in: chunk } },
    })
    await prisma.assetCheckout.deleteMany({
      where: { assetId: { in: chunk } },
    })
  }

  console.log('Deleting assets...')
  for (const chunk of chunkArray(assetIds, chunkSize)) {
    await prisma.asset.deleteMany({
      where: { id: { in: chunk } },
    })
  }

  console.log('Deletion complete.')
  const preview = assetCodes.slice(0, 20).join(', ')
  if (assetCodes.length > 20) {
    console.log(
      `Removed assets (${assetCodes.length} total). First 20: ${preview} ...`
    )
  } else {
    console.log(`Removed assets (${assetCodes.length}): ${preview}`)
  }
}

const mode = (process.argv[2] || 'sync').toLowerCase()

const runner = mode === 'delete-missing' ? deleteMissingAssets : syncAssets

runner()
  .catch((error) => {
    console.error(
      mode === 'delete-missing'
        ? 'Failed to delete assets missing from CSV:'
        : 'Failed to sync assets from CSV:',
      error
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
