// Delete FA assets that are not present in Asset Management Database.xlsx (sheet: List of Assets)
// Usage: node scripts/delete-assets-missing-in-excel.js

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const WORKBOOK_PATH = path.join(__dirname, '..', 'Asset Management Database.xlsx')
const SHEET_NAME = 'List of Assets'
const TMP_TSV_PATH = path.join(os.tmpdir(), `assets-delete-${Date.now()}.tsv`)

const safeTrim = (value) =>
  typeof value === 'string' ? value.trim().replace(/\uFEFF/g, '') : ''

const normalizeAssetCode = (value) =>
  safeTrim(value)
    .replace(/\s+/g, '')
    .toUpperCase()

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

const loadExcelFASet = () => {
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

  const excelFA = records
    .map((r) => normalizeAssetCode(r['Asset ID']))
    .filter((code) => code.startsWith('FA'))

  return new Set(excelFA)
}

const chunk = (arr, size = 100) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const main = async () => {
  let excelSet = null
  try {
    excelSet = loadExcelFASet()

    const dbAssets = await prisma.asset.findMany({
      select: { id: true, noAsset: true },
    })
    const dbFA = dbAssets.filter((a) =>
      normalizeAssetCode(a.noAsset || '').startsWith('FA')
    )

    const missingInExcel = dbFA.filter(
      (a) => !excelSet.has(normalizeAssetCode(a.noAsset || ''))
    )

    console.log(
      `Excel FA count: ${excelSet.size}, DB FA count: ${dbFA.length}, Missing in Excel: ${missingInExcel.length}`
    )

    if (missingInExcel.length === 0) {
      console.log('No DB assets to delete.')
      return
    }

    const idsToDelete = missingInExcel.map((a) => a.id)
    const codesToDelete = missingInExcel
      .map((a) => a.noAsset)
      .slice(0, 30)
      .join(', ')
    console.log(
      `Deleting ${idsToDelete.length} assets not present in Excel. Sample: ${codesToDelete}`
    )

    for (const portion of chunk(idsToDelete, 100)) {
      await prisma.assetEvent.deleteMany({
        where: { assetId: { in: portion } },
      })
      await prisma.sOAssetEntry.deleteMany({
        where: { assetId: { in: portion } },
      })
      await prisma.assetCheckout.deleteMany({
        where: { assetId: { in: portion } },
      })
      await prisma.asset.deleteMany({
        where: { id: { in: portion } },
      })
    }

    console.log('Deletion completed.')
  } finally {
    await prisma.$disconnect()
    if (fs.existsSync(TMP_TSV_PATH)) {
      fs.rmSync(TMP_TSV_PATH, { force: true })
    }
  }
}

main().catch((error) => {
  console.error('Failed to delete missing assets:', error)
  process.exitCode = 1
})
