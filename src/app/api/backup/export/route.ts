import { NextResponse } from 'next/server'
import archiver from 'archiver'
import { promises as fs } from 'node:fs'
import { PassThrough, Readable } from 'node:stream'
import path from 'node:path'
import crypto from 'node:crypto'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TABLES_TO_EXPORT = [
  'users',
  'sites',
  'categories',
  'departments',
  'employees',
  'asset_checkouts',
  'assets',
  'asset_custom_fields',
  'asset_custom_values',
  'so_sessions',
  'so_asset_entries',
  'asset_events',
  'logs',
  'backups'
] as const

type TableDump = Record<string, unknown[]>

type AssetImageManifestEntry = {
  assetId: string | 'orphaned-file'
  imageUrl: string
  relativePath: string
  fileName: string
  fileSize: number
}

type CollectedAssetImages = {
  manifest: AssetImageManifestEntry[]
  files: { relativePath: string; absolutePath: string }[]
  summary: {
    referenced: number
    included: number
    uniqueFiles: number
    missing: number
    skipped: number
    orphaned: number
  }
}

function isMissingTableError(error: unknown) {
  if (!error) return false

  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase()

  return (
    message.includes('does not exist') ||
    message.includes('undefined table') ||
    message.includes('schema cache') ||
    (message.includes('relation') && message.includes('not found')) ||
    message.includes('no such table')
  )
}

function ensureArrayRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(item => item)
}

function getValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in row) {
      const value = row[key]
      if (value !== undefined) {
        return value
      }
    }
  }
  return undefined
}

const stringOptional = (row: Record<string, unknown>, ...keys: string[]) => {
  const raw = getValue(row, keys)
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

const stringRequired = (table: string, row: Record<string, unknown>, ...keys: string[]) => {
  const value = stringOptional(row, ...keys)
  if (value === null || value === '') {
    throw new Error(`[backup/export] Missing required string "${keys[0]}" in table "${table}".`)
  }
  return value
}

async function fetchTableRowsPrisma(table: string): Promise<unknown[]> {
  if (!TABLES_TO_EXPORT.includes(table as (typeof TABLES_TO_EXPORT)[number])) {
    throw new Error(`Unsupported table requested: ${table}`)
  }

  try {
    const rows = await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}"`)
    return rows ?? []
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`Skipping missing table during export: ${table}`)
      return []
    }

    console.error(`Failed to export table ${table}:`, error)
    const message = error instanceof Error ? error.message : 'unexpected error'
    throw new Error(`Unable to export table ${table}: ${message}`)
  }
}

async function collectAssetImages(
  database: TableDump,
  uploadsDir: string
): Promise<CollectedAssetImages> {
  const assets = ensureArrayRecords(database.assets)
  const uniqueImageUrls = new Set<string>()
  const manifest: AssetImageManifestEntry[] = []
  const files: { relativePath: string; absolutePath: string }[] = []

  // First collect referenced images from assets
  for (const asset of assets) {
    const imageUrl = stringOptional(asset, 'imageUrl', 'image_url')
    if (!imageUrl) continue

    // Skip external URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log(`Skipping external image URL: ${imageUrl}`)
      continue
    }

    // Skip if already processed this URL
    if (uniqueImageUrls.has(imageUrl)) continue
    uniqueImageUrls.add(imageUrl)

    const assetId = stringRequired('assets', asset, 'id')
    const fileName = path.basename(imageUrl)
    const relativePath = `uploads/${fileName}`
    const absolutePath = path.join(uploadsDir, fileName)

    const entry: AssetImageManifestEntry = {
      assetId,
      imageUrl,
      relativePath,
      fileName,
      fileSize: 0 // Will be updated if file exists
    }

    try {
      const stats = await fs.stat(absolutePath)
      entry.fileSize = stats.size
      files.push({ relativePath, absolutePath })
    } catch (error: unknown) {
      console.warn(`Image file not found for asset ${assetId}: ${absolutePath}`)
    }

    manifest.push(entry)
  }

  // Then collect ALL files in uploads directory (including orphaned files)
  try {
    const allUploadFiles = await fs.readdir(uploadsDir)

    for (const fileName of allUploadFiles) {
      const filePath = path.join(uploadsDir, fileName)
      const stats = await fs.stat(filePath)

      if (stats.isFile()) {
        const relativePath = `uploads/${fileName}`
        const absolutePath = filePath

        // Only add if not already processed from assets
        const existingFile = files.find(f => f.relativePath === relativePath)
        if (!existingFile) {
          files.push({ relativePath, absolutePath })
          console.log(`Including orphaned upload file: ${fileName}`)

          // Add to manifest without asset reference
          manifest.push({
            assetId: 'orphaned-file',
            imageUrl: relativePath,
            relativePath,
            fileName,
            fileSize: stats.size
          })

          uniqueImageUrls.add(relativePath)
        }
      }
    }
  } catch (error: unknown) {
    console.warn(`Could not read uploads directory: ${error}`)
  }

  const summary = {
    referenced: assets.filter(a => stringOptional(a, 'imageUrl', 'image_url')).length,
    included: files.length,
    uniqueFiles: uniqueImageUrls.size,
    missing: manifest.filter(e => e.fileSize === 0).length,
    skipped: assets.filter(a => {
      const url = stringOptional(a, 'imageUrl', 'image_url')
      return url && (url.startsWith('http://') || url.startsWith('https://'))
    }).length,
    orphaned: manifest.filter(e => e.assetId === 'orphaned-file').length
  }

  return { manifest, files, summary }
}

async function readPackageVersion() {
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
  return packageJson.version ?? '0.0.0'
}

async function buildDumpWithPrisma() {
  const databaseDump: TableDump = {}
  const tableCounts: Record<string, number> = {}
  let totalRecords = 0

  for (const table of TABLES_TO_EXPORT) {
    const rows = await fetchTableRowsPrisma(table)
    databaseDump[table] = rows
    tableCounts[table] = rows.length
    totalRecords += rows.length
  }

  return { databaseDump, tableCounts, totalRecords }
}

export async function GET() {
  const archive = archiver('zip', { zlib: { level: 9 } })
  const stream = new PassThrough()
  archive.on('error', error => {
    stream.destroy(error)
  })
  archive.pipe(stream)

  const now = new Date()
  const isoDate = now.toISOString()
  const normalizedDate = isoDate.replace(/[:.]/g, '-')
  const archiveName = `asset-management-backup-${normalizedDate}.zip`
  const archiveLabel = `asset-management-backup-${normalizedDate}`

  try {
    const { databaseDump, tableCounts, totalRecords } = await buildDumpWithPrisma()
    const databaseJsonString = JSON.stringify(databaseDump, null, 2)
    const databaseChecksum = crypto.createHash('sha256').update(databaseJsonString).digest('hex')

    // Collect asset images
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const { manifest, files, summary } = await collectAssetImages(databaseDump, uploadsDir)

    const metadata = {
      name: archiveLabel,
      exportedAt: isoDate,
      exportedAtEpoch: now.getTime(),
      appVersion: await readPackageVersion(),
      totalRecords,
      tableCounts,
      database: {
        fileSizeBytes: Buffer.byteLength(databaseJsonString, 'utf-8'),
        checksumSha256: databaseChecksum
      },
      images: {
        ...summary,
        manifest: manifest.map(({ assetId, fileName, relativePath, imageUrl }) => ({
          assetId,
          fileName,
          relativePath,
          originalUrl: imageUrl
        }))
      },
      notes:
        `Generated by /api/backup/export. Includes relational data (users, assets, employees, SO sessions, logs) and ${summary.included} asset images (${summary.missing} images missing).`,
      engine: 'prisma'
    }

    // Add database files
    archive.append(databaseJsonString, { name: 'database.json' })
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

    // Add image files
    for (const { relativePath, absolutePath } of files) {
      archive.file(absolutePath, { name: relativePath })
    }

    archive.finalize().catch(error => {
      stream.destroy(error)
    })

    const response = new NextResponse(Readable.toWeb(stream) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archiveName}"`,
        'Cache-Control': 'no-store'
      }
    })

    return response
  } catch (error) {
    console.error('Backup export failed:', error)
    stream.destroy(error as Error)
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error occurred.'
    return NextResponse.json(
      { error: `Failed to generate backup export: ${message}` },
      { status: 500 }
    )
  }
}
