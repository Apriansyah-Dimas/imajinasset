const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const picNames = require('./pic-names')

const prisma = new PrismaClient()
const PIC_NAMES_PATH = path.join(__dirname, 'pic-names.js')

const safeTrim = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').replace(/\uFEFF/g, '') : ''

const normalizeName = (value) =>
  safeTrim(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')

const normalizedNameEntries = picNames
  .map((name) => safeTrim(name))
  .filter(Boolean)
  .map((name) => ({
    original: name,
    normalized: normalizeName(name),
  }))

const normalizedLookup = new Map(
  normalizedNameEntries.map((entry) => [entry.normalized, entry.original])
)

const findFullName = (rawName) => {
  const normalized = normalizeName(rawName)
  if (!normalized) return null

  const exact = normalizedLookup.get(normalized)
  if (exact) return exact

  const prefixMatch = normalizedNameEntries.filter((entry) =>
    entry.normalized.startsWith(`${normalized} `)
  )
  if (prefixMatch.length === 1) {
    return prefixMatch[0].original
  }

  return null
}

const generateBaseId = (name) => {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PIC'
  const base = sanitized.slice(0, 6) || 'PIC'
  return `PIC-${base}`
}

const main = async () => {
  const assets = await prisma.asset.findMany({
    select: { id: true, name: true, pic: true, picId: true },
  })
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, employeeId: true, isActive: true },
  })

  const employeeMap = new Map()
  const employeeIds = new Set()

  employees.forEach((employee) => {
    employeeMap.set(normalizeName(employee.name), employee)
    if (employee.employeeId) {
      employeeIds.add(employee.employeeId)
    }
  })

  const ensureUniqueEmployeeId = async (base) => {
    let attempt = base
    let counter = 1
    while (employeeIds.has(attempt)) {
      const suffix = String(counter).padStart(2, '0')
      attempt = `${base}-${suffix}`
      counter += 1
    }
    employeeIds.add(attempt)
    return attempt
  }

  const ensureEmployeeRecord = async (name) => {
    const normalized = normalizeName(name)
    let employee = employeeMap.get(normalized)

    if (!employee) {
      const employeeId = await ensureUniqueEmployeeId(generateBaseId(name))
      employee = await prisma.employee.create({
        data: {
          employeeId,
          name,
          email: null,
          department: null,
          position: null,
          joinDate: null,
          isActive: true,
        },
      })
      employeeMap.set(normalized, employee)
    } else if (!employee.isActive) {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { isActive: true },
      })
      employeeMap.set(normalized, employee)
    }

    return employee
  }

  const summary = {
    totalWithPic: 0,
    updatedAssets: 0,
    linkedPicId: 0,
    skippedAmbiguous: 0,
    missingMasterNames: 0,
  }

  const missingNames = new Map()
  const newMasterNames = new Set()

  for (const asset of assets) {
    const rawPic = safeTrim(asset.pic)
    if (!rawPic) {
      continue
    }
    summary.totalWithPic += 1

    const fullName = findFullName(rawPic)

    if (fullName) {
      const employee = await ensureEmployeeRecord(fullName)
      const needsPicUpdate = normalizeName(rawPic) !== normalizeName(fullName)
      const needsPicIdUpdate = asset.picId !== employee.id

      if (needsPicUpdate || needsPicIdUpdate) {
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            pic: fullName,
            picId: employee.id,
          },
        })
        summary.updatedAssets += 1
      } else if (!asset.picId) {
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            picId: employee.id,
          },
        })
        summary.linkedPicId += 1
      }
      continue
    }

    summary.skippedAmbiguous += 1
    const normalized = normalizeName(rawPic)
    if (!normalizedLookup.has(normalized)) {
      newMasterNames.add(rawPic)
      summary.missingMasterNames += 1
    }
    if (!missingNames.has(rawPic)) {
      missingNames.set(rawPic, [])
    }
    missingNames.get(rawPic).push(asset.name || asset.id)
  }

  if (newMasterNames.size > 0) {
    const existingNamesSet = new Set(picNames.map((name) => safeTrim(name)))
    const mergedNames = [
      ...existingNamesSet.values(),
      ...Array.from(newMasterNames)
        .map((name) => safeTrim(name))
        .filter(Boolean),
    ]
    const uniqueNames = Array.from(new Set(mergedNames))
    const fileBody = [
      'module.exports = [',
      ...uniqueNames.map((name) => `  '${name.replace(/'/g, "\\'")}',`),
      ']',
    ].join('\n')
    fs.writeFileSync(PIC_NAMES_PATH, `${fileBody}\n`, 'utf8')
    console.log(`Master PIC list updated with ${newMasterNames.size} new names.`)
  }

  if (missingNames.size > 0) {
    console.log('PIC names missing from master list:')
    missingNames.forEach((assetsList, name) => {
      console.log(`- ${name}: ${assetsList.join(', ')}`)
    })
  }

  console.log('Summary:', summary)
}

main()
  .catch((error) => {
    console.error('Failed to sync asset PIC names:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
