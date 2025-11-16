import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import unzipper from 'unzipper'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB
const DEFAULT_RESTORE_ORDER = [
  'sites',
  'categories',
  'departments',
  'employees',
  'users',
  'assets',
  'asset_checkouts',
  'asset_custom_fields',
  'asset_custom_values',
  'so_sessions',
  'so_asset_entries',
  'asset_events',
  'logs',
  'backups'
]

type TableDump = Record<string, Record<string, unknown>[]>

type BackupMetadata = {
  exportedAt?: string
  version?: string
  description?: string
  restoreOrder?: string[]
  images?: {
    manifest?: ImageManifest[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

type RestoreResult = {
  summary: Record<string, number>
  engine: 'prisma'
  totalRestored: number
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function resolveWorkingDirectory(extractedRoot: string) {
  const directDatabasePath = path.join(extractedRoot, 'database.json')
  if (await fileExists(directDatabasePath)) {
    return extractedRoot
  }

  const entries = await fs.readdir(extractedRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const subPath = path.join(extractedRoot, entry.name)
    const subDatabasePath = path.join(subPath, 'database.json')
    if (await fileExists(subDatabasePath)) {
      return subPath
    }
  }

  throw new Error('Could not find database.json in extracted archive')
}

async function parseJsonFile<T = unknown>(filePath: string) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    console.error(`Failed to parse JSON file ${filePath}:`, error)
    throw new Error(`Invalid JSON file: ${path.basename(filePath)}`)
  }
}

async function extractZipArchive(zipPath: string, destination: string) {
  const writeOperations: Promise<void>[] = []

  await new Promise<void>((resolve, reject) => {
    const parser = unzipper.Parse()
    parser.on('entry', (entry) => {
      if (entry.type === 'Directory') {
        entry.autodrain()
        return
      }

      const filePath = path.join(destination, entry.path)
      const task = (async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await new Promise<void>((res, rej) => {
          const writeStream = createWriteStream(filePath)
          entry.pipe(writeStream)
          writeStream.on('finish', res)
          writeStream.on('error', rej)
        })
      })()

      writeOperations.push(task)
    })
    parser.on('close', resolve)
    parser.on('error', reject)

    createReadStream(zipPath).pipe(parser)
  })

  await Promise.all(writeOperations)
}

function ensureArrayRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(item => item)
}

function resolveRestoreOrder(
  metadataOrder: unknown,
  database: TableDump
): string[] {
  const merged: string[] = []
  const seen = new Set<string>()

  const push = (table: unknown) => {
    if (typeof table !== 'string') return
    const normalized = table.trim()
    if (!normalized || seen.has(normalized)) return
    merged.push(normalized)
    seen.add(normalized)
  }

  if (Array.isArray(metadataOrder)) {
    metadataOrder.forEach(push)
  }

  DEFAULT_RESTORE_ORDER.forEach(push)
  Object.keys(database ?? {}).forEach(push)

  return merged
}

function isMissingTableError(error: unknown) {
  if (!error) return false

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : ''

  if (
    message.includes('does not exist') ||
    message.includes('undefined table') ||
    message.includes('schema cache') ||
    (message.includes('relation') && message.includes('not found'))
  ) {
    return true
  }

  const code = (error as { code?: string; details?: string }).code?.toUpperCase()
  const details = (error as { code?: string; details?: string }).details?.toLowerCase() ?? ''
  return code === '42P01' || code === 'PGRST116' || details.includes('does not exist')
}


type PrismaTx = Prisma.TransactionClient
type PrismaHandler = {
  delete: (tx: PrismaTx) => Promise<number>
  insert: (tx: PrismaTx, records: Record<string, unknown>[]) => Promise<number>
}

const getValue = (row: Record<string, unknown>, keys: string[]) => {
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
    throw new Error(`[backup/import] Missing required string "${keys[0]}" in table "${table}".`)
  }
  return value
}

const numberOptional = (row: Record<string, unknown>, ...keys: string[]) => {
  const raw = getValue(row, keys)
  if (raw === undefined || raw === null || raw === '') return null
  const num = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(num) ? num : null
}

const numberRequired = (table: string, row: Record<string, unknown>, ...keys: string[]) => {
  const value = numberOptional(row, ...keys)
  if (value === null) {
    throw new Error(`[backup/import] Missing required numeric field "${keys[0]}" in table "${table}".`)
  }
  return value
}

const booleanOptional = (row: Record<string, unknown>, ...keys: string[]) => {
  const raw = getValue(row, keys)
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (!normalized) return null
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  }
  return null
}

const booleanRequired = (table: string, row: Record<string, unknown>, ...keys: string[]) =>
  booleanOptional(row, ...keys) ?? false

const dateOptional = (row: Record<string, unknown>, ...keys: string[]) => {
  const raw = getValue(row, keys)
  if (raw === undefined || raw === null || raw === '') return null
  if (raw instanceof Date) return raw
  const date = new Date(raw as string)
  return Number.isNaN(date.getTime()) ? null : date
}

const dateRequired = (table: string, row: Record<string, unknown>, ...keys: string[]) =>
  dateOptional(row, ...keys) ?? new Date()

const finalizeRecord = <T extends Record<string, unknown>>(record: T): T => {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      output[key] = value
    }
  }
  return output as T
}

const transformSite = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('sites', row, 'id'),
    name: stringRequired('sites', row, 'name'),
    address: stringOptional(row, 'address'),
    city: stringOptional(row, 'city'),
    province: stringOptional(row, 'province'),
    postalCode: stringOptional(row, 'postalCode', 'postal_code'),
    country: stringOptional(row, 'country') ?? 'Indonesia',
    phone: stringOptional(row, 'phone'),
    email: stringOptional(row, 'email'),
    createdAt: dateRequired('sites', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('sites', row, 'updatedAt', 'updated_at')
  })

const transformCategory = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('categories', row, 'id'),
    name: stringRequired('categories', row, 'name'),
    description: stringOptional(row, 'description'),
    createdAt: dateRequired('categories', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('categories', row, 'updatedAt', 'updated_at')
  })

const transformDepartment = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('departments', row, 'id'),
    name: stringRequired('departments', row, 'name'),
    description: stringOptional(row, 'description'),
    createdAt: dateRequired('departments', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('departments', row, 'updatedAt', 'updated_at')
  })

const transformEmployee = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('employees', row, 'id'),
    employeeId: stringRequired('employees', row, 'employeeId', 'employee_id'),
    name: stringRequired('employees', row, 'name'),
    email: stringOptional(row, 'email'),
    department: stringOptional(row, 'department'),
    position: stringOptional(row, 'position'),
    joinDate: dateOptional(row, 'joinDate', 'join_date'),
    isActive: booleanOptional(row, 'isActive', 'is_active', 'isactive') ?? true,
    createdAt: dateRequired('employees', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('employees', row, 'updatedAt', 'updated_at')
  })

const transformUser = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('users', row, 'id'),
    email: stringRequired('users', row, 'email'),
    name: stringRequired('users', row, 'name'),
    password: stringRequired('users', row, 'password'),
    role: stringRequired('users', row, 'role'),
    isActive: booleanRequired('users', row, 'isActive', 'is_active', 'isactive'),
    createdAt: dateRequired('users', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('users', row, 'updatedAt', 'updated_at'),
    createdBy: stringOptional(row, 'createdBy', 'created_by', 'createdby')
  })

const transformAsset = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('assets', row, 'id'),
    name: stringRequired('assets', row, 'name'),
    noAsset: stringRequired('assets', row, 'noAsset', 'no_asset'),
    status: stringRequired('assets', row, 'status'),
    serialNo: stringOptional(row, 'serialNo', 'serial_no'),
    purchaseDate: dateOptional(row, 'purchaseDate', 'purchase_date'),
    cost: numberOptional(row, 'cost'),
    brand: stringOptional(row, 'brand'),
    model: stringOptional(row, 'model'),
    siteId: stringOptional(row, 'siteId', 'site_id'),
    categoryId: stringOptional(row, 'categoryId', 'category_id'),
    departmentId: stringOptional(row, 'departmentId', 'department_id'),
    picId: stringOptional(row, 'picId', 'pic_id'),
    pic: stringOptional(row, 'pic'),
    imageUrl: stringOptional(row, 'imageUrl', 'image_url'),
    notes: stringOptional(row, 'notes'),
    dateCreated: dateOptional(row, 'dateCreated', 'date_created') || new Date(),
    createdAt: dateRequired('assets', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('assets', row, 'updatedAt', 'updated_at')
  })

const transformAssetCheckout = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_checkouts', row, 'id'),
    assetId: stringRequired('asset_checkouts', row, 'assetId', 'asset_id'),
    assignToId: stringRequired('asset_checkouts', row, 'assignToId', 'assign_to_id'),
    departmentId: stringOptional(row, 'departmentId', 'department_id'),
    checkoutDate: dateRequired('asset_checkouts', row, 'checkoutDate', 'checkout_date'),
    dueDate: dateOptional(row, 'dueDate', 'due_date'),
    notes: stringOptional(row, 'notes'),
    signatureData: stringOptional(row, 'signatureData', 'signature_data'),
    status: stringRequired('asset_checkouts', row, 'status'),
    returnedAt: dateOptional(row, 'returnedAt', 'returned_at'),
    returnNotes: stringOptional(row, 'returnNotes', 'return_notes'),
    receivedById: stringOptional(row, 'receivedById', 'received_by_id'),
    returnSignatureData: stringOptional(row, 'returnSignatureData', 'return_signature_data'),
    createdAt: dateRequired('asset_checkouts', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('asset_checkouts', row, 'updatedAt', 'updated_at')
  })

type ImageManifest = {
  assetId: string
  fileName: string
  relativePath: string
  originalUrl: string
}

async function restoreAssetImages(
  extractedDir: string,
  metadata: { images?: { manifest?: ImageManifest[] } }
): Promise<{ restored: number; failed: number }> {
  if (!metadata?.images?.manifest?.length) {
    console.log('No asset images found in backup metadata')
    return { restored: 0, failed: 0 }
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })

  let restored = 0
  let failed = 0
  const restoredFiles: string[] = []

  try {
    for (const imageInfo of metadata.images.manifest) {
    // Fix path handling: ensure we look for the image in the correct location
    let sourcePath = path.join(extractedDir, imageInfo.relativePath)
    
    // If the relativePath starts with 'uploads/', we need to handle it correctly
    if (imageInfo.relativePath.startsWith('uploads/')) {
      sourcePath = path.join(extractedDir, imageInfo.relativePath)
    } else {
      // Try both with and without uploads prefix
      const withPrefix = path.join(extractedDir, 'uploads', imageInfo.fileName)
      const withoutPrefix = path.join(extractedDir, imageInfo.fileName)
      
      if (await fileExists(withPrefix)) {
        sourcePath = withPrefix
      } else if (await fileExists(withoutPrefix)) {
        sourcePath = withoutPrefix
      }
    }
    
    const destPath = path.join(uploadsDir, imageInfo.fileName)

      try {
        if (await fileExists(sourcePath)) {
          await fs.copyFile(sourcePath, destPath)
          restoredFiles.push(destPath)
          restored++
          console.log(`Restored image: ${imageInfo.fileName} for asset ${imageInfo.assetId}`)
        } else {
          console.warn(`Image file missing: ${imageInfo.relativePath} for asset ${imageInfo.assetId}`)
          failed++
        }
      } catch (error) {
        console.error(`Failed to restore image ${imageInfo.fileName}:`, error)
        failed++
        
        // Cleanup partially copied file if it exists
        try {
          if (await fileExists(destPath)) {
            await fs.unlink(destPath)
          }
        } catch (cleanupError) {
          console.error(`Failed to cleanup partial image ${imageInfo.fileName}:`, cleanupError)
        }
      }
    }
  } catch (error) {
    console.error('Critical error during image restoration, attempting cleanup:', error)
    
    // Cleanup all restored files if critical error occurs
    for (const filePath of restoredFiles) {
      try {
        if (await fileExists(filePath)) {
          await fs.unlink(filePath)
        }
      } catch (cleanupError) {
        console.error(`Failed to cleanup image ${filePath}:`, cleanupError)
      }
    }
    
    throw new Error('Image restoration failed, all files cleaned up')
  }

  return { restored, failed }
}

const transformAssetCustomField = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_custom_fields', row, 'id'),
    name: stringRequired('asset_custom_fields', row, 'name'),
    label: stringRequired('asset_custom_fields', row, 'label'),
    fieldType: stringRequired('asset_custom_fields', row, 'fieldType', 'field_type'),
    required: booleanRequired('asset_custom_fields', row, 'required'),
    isActive: booleanRequired('asset_custom_fields', row, 'isActive', 'is_active'),
    showCondition: stringOptional(row, 'showCondition', 'show_condition'),
    options: stringOptional(row, 'options'),
    defaultValue: stringOptional(row, 'defaultValue', 'default_value'),
    description: stringOptional(row, 'description'),
    createdAt: dateRequired('asset_custom_fields', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('asset_custom_fields', row, 'updatedAt', 'updated_at')
  })

const transformAssetCustomValue = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_custom_values', row, 'id'),
    assetId: stringRequired('asset_custom_values', row, 'assetId', 'asset_id'),
    customFieldId: stringRequired('asset_custom_values', row, 'customFieldId', 'custom_field_id'),
    stringValue: stringOptional(row, 'stringValue', 'string_value'),
    numberValue: numberOptional(row, 'numberValue', 'number_value'),
    dateValue: dateOptional(row, 'dateValue', 'date_value'),
    booleanValue: booleanOptional(row, 'booleanValue', 'boolean_value'),
    createdAt: dateRequired('asset_custom_values', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('asset_custom_values', row, 'updatedAt', 'updated_at')
  })

const transformSOSession = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('so_sessions', row, 'id'),
    name: stringRequired('so_sessions', row, 'name'),
    year: numberRequired('so_sessions', row, 'year'),
    description: stringOptional(row, 'description'),
    status: stringRequired('so_sessions', row, 'status'),
    totalAssets: numberOptional(row, 'totalAssets', 'total_assets') ?? 0,
    scannedAssets: numberOptional(row, 'scannedAssets', 'scanned_assets') ?? 0,
    createdAt: dateRequired('so_sessions', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('so_sessions', row, 'updatedAt', 'updated_at'),
    startedAt: dateOptional(row, 'startedAt', 'started_at'),
    completedAt: dateOptional(row, 'completedAt', 'completed_at')
  })

const transformSOAssetEntry = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('so_asset_entries', row, 'id'),
    soSessionId: stringRequired('so_asset_entries', row, 'soSessionId', 'so_session_id'),
    assetId: stringRequired('so_asset_entries', row, 'assetId', 'asset_id'),
    scannedAt: dateRequired('so_asset_entries', row, 'scannedAt', 'scanned_at'),
    status: stringRequired('so_asset_entries', row, 'status'),
    isIdentified: booleanRequired('so_asset_entries', row, 'isIdentified', 'is_identified'),
    tempName: stringOptional(row, 'tempName', 'temp_name'),
    tempStatus: stringOptional(row, 'tempStatus', 'temp_status'),
    tempSerialNo: stringOptional(row, 'tempSerialNo', 'temp_serial_no'),
    tempPic: stringOptional(row, 'tempPic', 'temp_pic'),
    tempNotes: stringOptional(row, 'tempNotes', 'temp_notes'),
    tempBrand: stringOptional(row, 'tempBrand', 'temp_brand'),
    tempModel: stringOptional(row, 'tempModel', 'temp_model'),
    tempCost: numberOptional(row, 'tempCost', 'temp_cost'),
    createdAt: dateRequired('so_asset_entries', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('so_asset_entries', row, 'updatedAt', 'updated_at')
  })

const transformLog = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('logs', row, 'id'),
    level: stringRequired('logs', row, 'level'),
    message: stringRequired('logs', row, 'message'),
    data: stringOptional(row, 'data'),
    userId: stringOptional(row, 'userId', 'user_id'),
    ipAddress: stringOptional(row, 'ipAddress', 'ip_address'),
    userAgent: stringOptional(row, 'userAgent', 'user_agent'),
    createdAt: dateRequired('logs', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('logs', row, 'updatedAt', 'updated_at')
  })

const transformBackup = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('backups', row, 'id'),
    name: stringRequired('backups', row, 'name'),
    filePath: stringRequired('backups', row, 'filePath', 'file_path'),
    fileSize: numberOptional(row, 'fileSize', 'file_size'),
    status: stringOptional(row, 'status') ?? 'completed',
    createdAt: dateRequired('backups', row, 'createdAt', 'created_at'),
    createdBy: stringOptional(row, 'createdBy', 'createdby')
  })

const transformAssetEvent = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_events', row, 'id'),
    assetId: stringRequired('asset_events', row, 'assetId', 'asset_id'),
    type: stringRequired('asset_events', row, 'type'),
    actor: stringOptional(row, 'actor'),
    checkoutId: stringOptional(row, 'checkoutId', 'checkout_id'),
    soSessionId: stringOptional(row, 'soSessionId', 'so_session_id'),
    soAssetEntryId: stringOptional(row, 'soAssetEntryId', 'so_asset_entry_id'),
    payload: stringOptional(row, 'payload'),
    createdAt: dateRequired('asset_events', row, 'createdAt', 'created_at')
  })

const prismaHandlers: Record<string, PrismaHandler> = {
  sites: {
    delete: async (tx) => (await tx.site.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformSite)
      if (!data.length) return 0
      const result = await tx.site.createMany({ data })
      return result.count
    }
  },
  categories: {
    delete: async (tx) => (await tx.category.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformCategory)
      if (!data.length) return 0
      const result = await tx.category.createMany({ data })
      return result.count
    }
  },
  departments: {
    delete: async (tx) => (await tx.department.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformDepartment)
      if (!data.length) return 0
      const result = await tx.department.createMany({ data })
      return result.count
    }
  },
  employees: {
    delete: async (tx) => (await tx.employee.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformEmployee)
      if (!data.length) return 0
      const result = await tx.employee.createMany({ data })
      return result.count
    }
  },
  asset_checkouts: {
    delete: async (tx) => (await tx.assetCheckout.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAssetCheckout)
      if (!data.length) return 0
      const result = await tx.assetCheckout.createMany({ data })
      return result.count
    }
  },
  users: {
    delete: async (tx) => (await tx.user.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformUser)
      if (!data.length) return 0
      const result = await tx.user.createMany({ data })
      return result.count
    }
  },
  assets: {
    delete: async (tx) => (await tx.asset.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAsset)
      if (!data.length) return 0
      const result = await tx.asset.createMany({ data })
      return result.count
    }
  },
  asset_custom_fields: {
    delete: async (tx) => (await tx.assetCustomField.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAssetCustomField)
      if (!data.length) return 0
      const result = await tx.assetCustomField.createMany({ data })
      return result.count
    }
  },
  asset_custom_values: {
    delete: async (tx) => (await tx.assetCustomValue.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAssetCustomValue)
      if (!data.length) return 0
      const result = await tx.assetCustomValue.createMany({ data })
      return result.count
    }
  },
  so_sessions: {
    delete: async (tx) => (await tx.sOSession.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformSOSession)
      if (!data.length) return 0
      const result = await tx.sOSession.createMany({ data })
      return result.count
    }
  },
  so_asset_entries: {
    delete: async (tx) => (await tx.sOAssetEntry.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformSOAssetEntry)
      if (!data.length) return 0
      const result = await tx.sOAssetEntry.createMany({ data })
      return result.count
    }
  },
  asset_events: {
    delete: async (tx) => (await tx.assetEvent.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAssetEvent)
      if (!data.length) return 0
      const result = await tx.assetEvent.createMany({ data })
      return result.count
    }
  },
  logs: {
    delete: async (tx) => {
      try {
        // Use raw SQL for logs table as it may not be in Prisma client
        const result = await tx.$executeRaw`DELETE FROM "logs"`
        return Array.isArray(result) ? result.length : Number(result)
      } catch (error) {
        console.warn('Failed to delete logs table, may not exist:', error)
        return 0
      }
    },
    insert: async (tx, records) => {
      const data = records.map(transformLog)
      if (!data.length) return 0
      try {
        // Use raw SQL for logs table as it may not be in Prisma client
        let inserted = 0
        for (const record of data) {
          await tx.$executeRaw`
            INSERT INTO "logs" (id, level, message, data, "userId", "ipAddress", "userAgent", "createdAt", "updatedAt")
            VALUES (${record.id}, ${record.level}, ${record.message}, ${record.data}, ${record.userId}, ${record.ipAddress}, ${record.userAgent}, ${record.createdAt}, ${record.updatedAt})
          `
          inserted++
        }
        return inserted
      } catch (error) {
        console.warn('Failed to insert logs table, may not exist:', error)
        return 0
      }
    }
  },
  backups: {
    delete: async (tx) => {
      try {
        // Use raw SQL for backups table as it may not be in Prisma client
        const result = await tx.$executeRaw`DELETE FROM "backups"`
        return Array.isArray(result) ? result.length : Number(result)
      } catch (error) {
        console.warn('Failed to delete backups table, may not exist:', error)
        return 0
      }
    },
    insert: async (tx, records) => {
      const data = records.map(transformBackup)
      if (!data.length) return 0
      try {
        // Use raw SQL for backups table as it may not be in Prisma client
        let inserted = 0
        for (const record of data) {
          await tx.$executeRaw`
            INSERT INTO "backups" (id, name, "filePath", "fileSize", status, "createdAt", "createdBy")
            VALUES (${record.id}, ${record.name}, ${record.filePath}, ${record.fileSize}, ${record.status}, ${record.createdAt}, ${record.createdBy})
          `
          inserted++
        }
        return inserted
      } catch (error) {
        console.warn('Failed to insert backups table, may not exist:', error)
        return 0
      }
    }
  }
}

async function restoreWithPrisma(
  database: TableDump,
  restoreOrder: string[]
): Promise<Record<string, number>> {
  const summary: Record<string, number> = {}

  await db.$transaction(async (tx) => {
    for (const tableName of [...restoreOrder].reverse()) {
      const handler = prismaHandlers[tableName]
      if (!handler) continue
      await handler.delete(tx)
    }

    for (const tableName of restoreOrder) {
      const handler = prismaHandlers[tableName]
      const records = ensureArrayRecords(database[tableName])
      if (!handler) {
        if (records.length) {
          console.warn(`[backup/import] No Prisma handler for table "${tableName}", skipping ${records.length} records.`)
        }
        summary[tableName] = 0
        continue
      }

      const inserted = await handler.insert(tx, records)
      summary[tableName] = inserted
    }
  })

  return summary
}

async function restoreDatabase(
  database: TableDump,
  restoreOrder: string[]
): Promise<RestoreResult> {
  const summary = await restoreWithPrisma(database, restoreOrder)
  const totalRestored = Object.values(summary).reduce((sum, value) => sum + (value ?? 0), 0)
  return { summary, engine: 'prisma', totalRestored }
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), `backup-import-${crypto.randomUUID()}`)

  try {
    const formData = await request.formData()
    const uploadedFile = formData.get('file') as File | null

    if (!uploadedFile) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (uploadedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB limit` },
        { status: 413 }
      )
    }

    if (!uploadedFile.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Only ZIP files are supported' }, { status: 400 })
    }

    await fs.mkdir(tempDir, { recursive: true })

    const zipPath = path.join(tempDir, uploadedFile.name)
    const buffer = Buffer.from(await uploadedFile.arrayBuffer())
    await fs.writeFile(zipPath, buffer)

    const extractedDir = path.join(tempDir, 'extracted')
    await fs.mkdir(extractedDir, { recursive: true })
    await extractZipArchive(zipPath, extractedDir)

    const workingDir = await resolveWorkingDirectory(extractedDir)

    const databasePath = path.join(workingDir, 'database.json')
    const metadataPath = path.join(workingDir, 'metadata.json')

    for (const [name, filePath] of [
      ['database.json', databasePath],
      ['metadata.json', metadataPath]
    ]) {
      if (!(await fileExists(filePath))) {
        throw new Error(`Missing required file: ${name}`)
      }
    }

    const database = await parseJsonFile<TableDump>(databasePath)
    const metadata = await parseJsonFile<BackupMetadata>(metadataPath)

    if (!database || typeof database !== 'object') {
      throw new Error('Invalid database structure in backup file')
    }

    // Restore database first
    const restoreOrder = resolveRestoreOrder(metadata?.restoreOrder, database)
    const { summary, engine, totalRestored } = await restoreDatabase(database, restoreOrder)

    // Then restore asset images
    const imageResult = await restoreAssetImages(workingDir, metadata)

    return NextResponse.json({
      success: true,
      message: 'Database and assets restored successfully',
      importedTables: summary,
      totalRestored,
      engine,
      imagesRestored: imageResult?.restored ?? 0,
      imagesFailed: imageResult?.failed ?? 0,
      metadata: {
        exportedAt: metadata?.exportedAt ?? null,
        version: metadata?.version ?? null,
        description: metadata?.description ?? null
      }
    })
  } catch (error) {
    console.error('Backup import error:', error)
    const message = error instanceof Error ? error.message : 'Failed to import backup'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
}
