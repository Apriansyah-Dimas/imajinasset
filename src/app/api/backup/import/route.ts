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
  'login_history', // New table - may not exist in older backups
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

type CompatibilityInfo = {
  isCompatible: boolean
  backupVersion: string
  warnings: string[]
  missingTables: string[]
  estimatedBackupYear?: number
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

function detectBackupCompatibility(metadata: BackupMetadata, database: TableDump): CompatibilityInfo {
  const warnings: string[] = []
  const missingTables: string[] = []
  const availableTables = Object.keys(database)

  // Determine backup version
  const backupVersion = metadata.version || 'unknown'
  const exportedAt = metadata.exportedAt

  // Estimate backup year from export date if available
  let estimatedBackupYear: number | undefined
  if (exportedAt) {
    try {
      estimatedBackupYear = new Date(exportedAt).getFullYear()
    } catch {
      // Invalid date format
    }
  }

  // Check for missing newer tables that indicate legacy backup
  const newerTables = [
    'login_history', // Added in recent versions
    'asset_maintenance_requests', // Future feature
    'asset_calibrations', // Future feature
  ]

  const presentNewerTables = newerTables.filter(table => availableTables.includes(table))
  const presentOlderTables = availableTables.filter(table => !newerTables.includes(table))

  // Legacy backup detection
  if (!availableTables.includes('login_history') && presentOlderTables.length > 0) {
    warnings.push('This appears to be a legacy backup (missing login_history table). Login history will not be imported.')
    missingTables.push('login_history')
  }

  // Check for essential tables
  const essentialTables = ['users', 'assets']
  const missingEssential = essentialTables.filter(table => !availableTables.includes(table))
  if (missingEssential.length > 0) {
    warnings.push(`Missing essential tables: ${missingEssential.join(', ')}. This backup may be incomplete.`)
  }

  // Check data consistency
  const userCount = database.users?.length || 0
  const assetCount = database.assets?.length || 0

  if (userCount === 0 && assetCount > 0) {
    warnings.push('No users found in backup, but assets exist. Some asset assignments may be broken.')
  }

  if (assetCount === 0 && userCount > 0) {
    warnings.push('No assets found in backup, but users exist. This appears to be an incomplete backup.')
  }

  // Check for missing foreign key references
  if (database.employees?.length > 0 && !database.users?.length) {
    warnings.push('Employee data found but no user data. Employee assignments may not work correctly.')
  }

  if (database.asset_checkouts?.length > 0 && !database.assets?.length) {
    warnings.push('Checkout records found but no asset data. Checkouts cannot be restored.')
  }

  // Version-specific warnings
  if (backupVersion !== 'unknown') {
    // Add version-specific compatibility checks here if needed
    if (backupVersion.startsWith('0.0.') || backupVersion.startsWith('0.1.')) {
      warnings.push('This backup was created from an early version. Some features may not be available.')
    }
  }

  const isCompatible = missingEssential.length === 0

  return {
    isCompatible,
    backupVersion,
    warnings,
    missingTables,
    estimatedBackupYear
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
    // For backward compatibility, throw error only for truly critical fields
    const criticalFields = ['id', 'name', 'email'] // Fields that absolutely must exist
    if (criticalFields.includes(keys[0])) {
      throw new Error(`[backup/import] Missing required string "${keys[0]}" in table "${table}".`)
    }
    // For non-critical required fields, use a default value
    console.warn(`[backup/import] Missing optional required field "${keys[0]}" in table "${table}", using default value.`)
    return keys[0].includes('name') ? 'Unknown' : keys[0].includes('email') ? 'unknown@example.com' : ''
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
    // For backward compatibility, use default values for missing required numeric fields
    const criticalFields = ['year'] // Fields that absolutely must exist and be numeric
    if (criticalFields.includes(keys[0])) {
      throw new Error(`[backup/import] Missing required numeric field "${keys[0]}" in table "${table}".`)
    }
    console.warn(`[backup/import] Missing optional required numeric field "${keys[0]}" in table "${table}", using default value 0.`)
    return 0
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

const booleanRequired = (table: string, row: Record<string, unknown>, ...keys: string[]) => {
  const value = booleanOptional(row, ...keys)
  if (value === null) {
    console.warn(`[backup/import] Missing optional required boolean field "${keys[0]}" in table "${table}", using default value false.`)
    return false
  }
  return value
}

const dateOptional = (row: Record<string, unknown>, ...keys: string[]) => {
  const raw = getValue(row, keys)
  if (raw === undefined || raw === null || raw === '') return null
  if (raw instanceof Date) return raw
  const date = new Date(raw as string)
  return Number.isNaN(date.getTime()) ? null : date
}

const dateRequired = (table: string, row: Record<string, unknown>, ...keys: string[]) => {
  const value = dateOptional(row, ...keys)
  if (value === null) {
    console.warn(`[backup/import] Missing optional required date field "${keys[0]}" in table "${table}", using current date.`)
    return new Date()
  }
  return value
}

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
    sortOrder: numberOptional(row, 'sortOrder', 'sort_order', 'sortorder') ?? 0,
    createdAt: dateRequired('sites', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('sites', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformCategory = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('categories', row, 'id'),
    name: stringRequired('categories', row, 'name'),
    sortOrder: numberOptional(row, 'sortOrder', 'sort_order', 'sortorder') ?? 0,
    createdAt: dateRequired('categories', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('categories', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformDepartment = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('departments', row, 'id'),
    name: stringRequired('departments', row, 'name'),
    sortOrder: numberOptional(row, 'sortOrder', 'sort_order', 'sortorder') ?? 0,
    description: stringOptional(row, 'description'),
    createdAt: dateRequired('departments', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('departments', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformEmployee = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('employees', row, 'id'),
    name: stringRequired('employees', row, 'name'),
    createdAt: dateRequired('employees', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('employees', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformUser = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('users', row, 'id'),
    email: stringRequired('users', row, 'email'),
    name: stringRequired('users', row, 'name'),
    password: stringRequired('users', row, 'password'),
    role: stringRequired('users', row, 'role'),
    isActive: booleanRequired('users', row, 'isActive', 'is_active', 'isactive'),
    createdAt: dateRequired('users', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('users', row, 'updatedAt', 'updated_at', 'updatedat'),
    createdBy: stringOptional(row, 'createdBy', 'created_by', 'createdby')
  })

const transformAsset = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('assets', row, 'id'),
    name: stringRequired('assets', row, 'name'),
    noAsset: stringRequired('assets', row, 'noAsset', 'no_asset'),
    status: stringRequired('assets', row, 'status'),
    serialNo: stringOptional(row, 'serialNo', 'serial_no', 'serialno'),
    purchaseDate: dateOptional(row, 'purchaseDate', 'purchase_date', 'purchasedate'),
    cost: numberOptional(row, 'cost'),
    brand: stringOptional(row, 'brand'),
    model: stringOptional(row, 'model'),
    siteId: stringOptional(row, 'siteId', 'site_id', 'siteid'),
    categoryId: stringOptional(row, 'categoryId', 'category_id', 'categoryid'),
    departmentId: stringOptional(row, 'departmentId', 'department_id', 'departmentid'),
    picId: stringOptional(row, 'picId', 'pic_id', 'picid'),
    pic: stringOptional(row, 'pic'),
    imageUrl: stringOptional(row, 'imageUrl', 'image_url', 'imageurl'),
    notes: stringOptional(row, 'notes'),
    createdAt: dateRequired('assets', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('assets', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformAssetCheckout = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_checkouts', row, 'id'),
    assetId: stringRequired('asset_checkouts', row, 'assetId', 'asset_id', 'assetid'),
    assignToId: stringRequired('asset_checkouts', row, 'assignToId', 'assign_to_id', 'assigntoid'),
    departmentId: stringOptional(row, 'departmentId', 'department_id', 'departmentid'),
    checkoutDate: dateRequired('asset_checkouts', row, 'checkoutDate', 'checkout_date', 'checkoutdate'),
    dueDate: dateOptional(row, 'dueDate', 'due_date', 'duedate'),
    notes: stringOptional(row, 'notes'),
    signatureData: stringOptional(row, 'signatureData', 'signature_data', 'signaturedata'),
    status: stringRequired('asset_checkouts', row, 'status'),
    returnedAt: dateOptional(row, 'returnedAt', 'returned_at', 'returnedat'),
    returnNotes: stringOptional(row, 'returnNotes', 'return_notes', 'returnnotes'),
    receivedById: stringOptional(row, 'receivedById', 'received_by_id', 'receivedbyid'),
    returnSignatureData: stringOptional(row, 'returnSignatureData', 'return_signature_data', 'returnsignaturedata'),
    createdAt: dateRequired('asset_checkouts', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('asset_checkouts', row, 'updatedAt', 'updated_at', 'updatedat')
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
    fieldType: stringRequired('asset_custom_fields', row, 'fieldType', 'field_type', 'fieldtype'),
    required: booleanRequired('asset_custom_fields', row, 'required'),
    isActive: booleanRequired('asset_custom_fields', row, 'isActive', 'is_active', 'isactive'),
    showCondition: stringOptional(row, 'showCondition', 'show_condition', 'showcondition'),
    options: stringOptional(row, 'options'),
    defaultValue: stringOptional(row, 'defaultValue', 'default_value', 'defaultvalue'),
    description: stringOptional(row, 'description'),
    createdAt: dateRequired('asset_custom_fields', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('asset_custom_fields', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformAssetCustomValue = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_custom_values', row, 'id'),
    assetId: stringRequired('asset_custom_values', row, 'assetId', 'asset_id', 'assetid'),
    customFieldId: stringRequired('asset_custom_values', row, 'customFieldId', 'custom_field_id', 'customfieldid'),
    stringValue: stringOptional(row, 'stringValue', 'string_value', 'stringvalue'),
    numberValue: numberOptional(row, 'numberValue', 'number_value', 'numbervalue'),
    dateValue: dateOptional(row, 'dateValue', 'date_value', 'datevalue'),
    booleanValue: booleanOptional(row, 'booleanValue', 'boolean_value', 'booleanvalue'),
    createdAt: dateRequired('asset_custom_values', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('asset_custom_values', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformSOSession = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('so_sessions', row, 'id'),
    name: stringRequired('so_sessions', row, 'name'),
    year: numberRequired('so_sessions', row, 'year'),
    description: stringOptional(row, 'description'),
    notes: stringOptional(row, 'notes'),
    completionNotes: stringOptional(row, 'completionNotes', 'completion_notes', 'completionnotes'),
    status: stringRequired('so_sessions', row, 'status'),
    totalAssets: numberOptional(row, 'totalAssets', 'total_assets', 'totalassets') ?? 0,
    scannedAssets: numberOptional(row, 'scannedAssets', 'scanned_assets', 'scannedassets') ?? 0,
    planStart: dateOptional(row, 'planStart', 'plan_start', 'planstart'),
    planEnd: dateOptional(row, 'planEnd', 'plan_end', 'planend'),
    createdAt: dateRequired('so_sessions', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('so_sessions', row, 'updatedAt', 'updated_at', 'updatedat'),
    startedAt: dateOptional(row, 'startedAt', 'started_at', 'startedat'),
    completedAt: dateOptional(row, 'completedAt', 'completed_at', 'completedat')
  })

const transformSOAssetEntry = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('so_asset_entries', row, 'id'),
    soSessionId: stringRequired('so_asset_entries', row, 'soSessionId', 'so_session_id', 'sosessionid'),
    assetId: stringRequired('so_asset_entries', row, 'assetId', 'asset_id', 'assetid'),
    scannedAt: dateRequired('so_asset_entries', row, 'scannedAt', 'scanned_at', 'scannedat'),
    status: stringRequired('so_asset_entries', row, 'status'),
    isIdentified: booleanRequired('so_asset_entries', row, 'isIdentified', 'is_identified', 'isidentified'),
    isCrucial: booleanOptional(row, 'isCrucial', 'is_crucial', 'iscrucial') ?? false,
    pendingNotes: stringOptional(row, 'pendingNotes', 'pending_notes', 'pendingnotes'),
    tempPurchaseDate: dateOptional(row, 'tempPurchaseDate', 'temp_purchase_date', 'temppurchasedate'),
    tempName: stringOptional(row, 'tempName', 'temp_name', 'tempname'),
    tempStatus: stringOptional(row, 'tempStatus', 'temp_status', 'tempstatus'),
    tempSerialNo: stringOptional(row, 'tempSerialNo', 'temp_serial_no', 'tempserialno'),
    tempPic: stringOptional(row, 'tempPic', 'temp_pic', 'temppic'),
    tempNotes: stringOptional(row, 'tempNotes', 'temp_notes', 'tempnotes'),
    tempBrand: stringOptional(row, 'tempBrand', 'temp_brand', 'tempbrand'),
    tempModel: stringOptional(row, 'tempModel', 'temp_model', 'tempmodel'),
    tempCost: numberOptional(row, 'tempCost', 'temp_cost', 'tempcost'),
    tempImageUrl: stringOptional(row, 'tempImageUrl', 'temp_image_url', 'tempimageurl'),
    tempNoAsset: stringOptional(row, 'tempNoAsset', 'temp_noasset', 'tempnoasset'),
    tempSiteId: stringOptional(row, 'tempSiteId', 'temp_site_id', 'tempsiteid'),
    tempCategoryId: stringOptional(row, 'tempCategoryId', 'temp_category_id', 'tempcategoryid'),
    tempDepartmentId: stringOptional(row, 'tempDepartmentId', 'temp_department_id', 'tempdepartmentid'),
    tempPicId: stringOptional(row, 'tempPicId', 'temp_pic_id', 'temppicid'),
    createdAt: dateRequired('so_asset_entries', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('so_asset_entries', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformLog = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('logs', row, 'id'),
    level: stringRequired('logs', row, 'level'),
    message: stringRequired('logs', row, 'message'),
    data: stringOptional(row, 'data'),
    userId: stringOptional(row, 'userId', 'user_id', 'userid'),
    ipAddress: stringOptional(row, 'ipAddress', 'ip_address', 'ipaddress'),
    userAgent: stringOptional(row, 'userAgent', 'user_agent', 'useragent'),
    createdAt: dateRequired('logs', row, 'createdAt', 'created_at', 'createdat'),
    updatedAt: dateRequired('logs', row, 'updatedAt', 'updated_at', 'updatedat')
  })

const transformBackup = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('backups', row, 'id'),
    name: stringRequired('backups', row, 'name'),
    filePath: stringRequired('backups', row, 'filePath', 'file_path', 'filepath'),
    fileSize: numberOptional(row, 'fileSize', 'file_size', 'filesize'),
    status: stringOptional(row, 'status') ?? 'completed',
    createdAt: dateRequired('backups', row, 'createdAt', 'created_at', 'createdat'),
    createdBy: stringOptional(row, 'createdBy', 'createdby')
  })

const transformAssetEvent = (row: Record<string, unknown>) =>
  finalizeRecord({
    id: stringRequired('asset_events', row, 'id'),
    assetId: stringRequired('asset_events', row, 'assetId', 'asset_id', 'assetid'),
    type: stringRequired('asset_events', row, 'type'),
    actor: stringOptional(row, 'actor'),
    checkoutId: stringOptional(row, 'checkoutId', 'checkout_id', 'checkoutid'),
    soSessionId: stringOptional(row, 'soSessionId', 'so_session_id', 'sosessionid'),
    soAssetEntryId: stringOptional(row, 'soAssetEntryId', 'so_asset_entry_id', 'soassetentryid'),
    payload: stringOptional(row, 'payload'),
    createdAt: dateRequired('asset_events', row, 'createdAt', 'created_at', 'createdat')
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
  // Handler for login_history table (may not exist in older backups)
  login_history: {
    delete: async (tx) => {
      try {
        // Try to delete login history if table exists
        const result = await tx.$executeRaw`DELETE FROM "login_history"`
        return Array.isArray(result) ? result.length : Number(result)
      } catch (error) {
        console.warn('[backup/import] Login history table does not exist or cannot be cleared:', error)
        return 0
      }
    },
    insert: async (tx, records) => {
      try {
        if (!records.length) return 0

        // Try to insert login history records using raw SQL
        let inserted = 0
        for (const record of records) {
          await tx.$executeRaw`
            INSERT INTO "login_history" (id, "userId", isSuccess, "ipAddress", "userAgent", "loginAt", "createdAt", "updatedAt")
            VALUES (${record.id}, ${record.userId}, ${record.isSuccess}, ${record.ipAddress}, ${record.userAgent}, ${record.loginAt}, ${record.createdAt}, ${record.updatedAt})
          `
          inserted++
        }
        return inserted
      } catch (error) {
        console.warn('[backup/import] Login history table does not exist or cannot be inserted:', error)
        return 0
      }
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
  const errors: string[] = []

  await db.$transaction(async (tx) => {
    // Step 1: Delete existing data (with error handling)
    for (const tableName of [...restoreOrder].reverse()) {
      const handler = prismaHandlers[tableName]
      if (!handler) continue

      try {
        await handler.delete(tx)
        console.log(`[backup/import] Successfully cleared table "${tableName}"`)
      } catch (error) {
        console.warn(`[backup/import] Failed to clear table "${tableName}":`, error)
        // Continue even if deletion fails - table might not exist
      }
    }

    // Step 2: Insert new data (with comprehensive error handling)
    for (const tableName of restoreOrder) {
      const handler = prismaHandlers[tableName]
      const records = ensureArrayRecords(database[tableName])

      // Skip if no records in backup
      if (!records.length) {
        console.log(`[backup/import] No records found for table "${tableName}" in backup`)
        summary[tableName] = 0
        continue
      }

      // Skip if no handler available
      if (!handler) {
        console.warn(`[backup/import] No handler for table "${tableName}", skipping ${records.length} records.`)
        summary[tableName] = 0
        continue
      }

      try {
        // Validate records before insertion
        const validRecords = records.filter(record => {
          if (!record || typeof record !== 'object') {
            console.warn(`[backup/import] Invalid record in table "${tableName}":`, record)
            return false
          }
          return true
        })

        if (validRecords.length !== records.length) {
          console.warn(`[backup/import] Filtered ${records.length - validRecords.length} invalid records from table "${tableName}"`)
        }

        if (!validRecords.length) {
          summary[tableName] = 0
          continue
        }

        const inserted = await handler.insert(tx, validRecords)
        summary[tableName] = inserted
        console.log(`[backup/import] Successfully inserted ${inserted} records into table "${tableName}"`)
      } catch (error) {
        const errorMessage = `Failed to insert records into table "${tableName}": ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[backup/import] ${errorMessage}`)
        errors.push(errorMessage)
        summary[tableName] = 0

        // Continue with other tables even if this one fails
        continue
      }
    }
  })

  // Log summary
  const totalImported = Object.values(summary).reduce((sum, count) => sum + count, 0)
  console.log(`[backup/import] Import completed. Total records imported: ${totalImported}`)

  if (errors.length > 0) {
    console.warn(`[backup/import] Encountered ${errors.length} errors during import:`, errors)
  }

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

    // Check compatibility before proceeding
    const compatibility = detectBackupCompatibility(metadata, database)
    console.log(`[backup/import] Backup compatibility check completed:`, compatibility)

    // Log warnings for user awareness
    if (compatibility.warnings.length > 0) {
      console.log(`[backup/import] Compatibility warnings (${compatibility.warnings.length}):`)
      compatibility.warnings.forEach(warning => {
        console.log(`[backup/import] - ${warning}`)
      })
    }

    // Check if backup is compatible enough to proceed
    if (!compatibility.isCompatible) {
      throw new Error(`Backup is not compatible: Missing essential data tables. Warnings: ${compatibility.warnings.join('; ')}`)
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
      },
      compatibility: {
        isCompatible: compatibility.isCompatible,
        backupVersion: compatibility.backupVersion,
        warnings: compatibility.warnings,
        missingTables: compatibility.missingTables,
        estimatedBackupYear: compatibility.estimatedBackupYear
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
