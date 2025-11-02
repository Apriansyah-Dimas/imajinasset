import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import unzipper from 'unzipper'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { PostgrestError } from '@supabase/supabase-js'

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
  'asset_custom_fields',
  'asset_custom_values',
  'so_sessions',
  'so_asset_entries'
]

type TableDump = Record<string, Record<string, unknown>[]>

type BackupMetadata = {
  exportedAt?: string
  version?: string
  description?: string
  restoreOrder?: string[]
  [key: string]: unknown
}

type RestoreResult = {
  summary: Record<string, number>
  engine: 'prisma' | 'supabase'
  totalRestored: number
}

const preferPrismaEngine = () => {
  if (process.env.ASSETSO_FORCE_PRISMA_BACKUP_IMPORT === 'true') {
    return true
  }

  const url = process.env.DATABASE_URL ?? ''
  if (!url) return false

  const normalized = url.toLowerCase()
  return normalized.startsWith('file:') || normalized.includes('sqlite')
}

const canUseSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

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

  const code = (error as Partial<PostgrestError>).code?.toUpperCase()
  const details = (error as Partial<PostgrestError>).details?.toLowerCase() ?? ''
  return code === '42P01' || code === 'PGRST116' || details.includes('does not exist')
}

async function truncateTableSupabase(tableName: string) {
  try {
    const { error: checkError } = await supabaseAdmin
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (checkError && isMissingTableError(checkError)) {
      console.warn(`Skipping clean for missing table: ${tableName}`)
      return 0
    }

    const { error, count } = await supabaseAdmin
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id', { count: 'exact', head: true })

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(`Skipping clean for missing table via Supabase: ${tableName}`)
        return 0
      }
      throw error
    }

    return count ?? 0
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`Skipping clean for missing table via Supabase: ${tableName}`)
      return 0
    }
    throw new Error(
      `Failed to truncate table ${tableName}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function restoreTableSupabase(tableName: string, records: Record<string, unknown>[]) {
  if (!records.length) {
    return 0
  }

  const { error: checkError } = await supabaseAdmin
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (checkError && isMissingTableError(checkError)) {
    console.warn(`Table ${tableName} does not exist, skipping restore`)
    return 0
  }

  const batchSize = 200
  let inserted = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabaseAdmin
      .from(tableName)
      .insert(batch, { returning: 'minimal' })

    if (error) {
      throw new Error(
        `Failed to restore data into ${tableName}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
    inserted += batch.length
  }

  return inserted
}

async function restoreWithSupabase(
  database: TableDump,
  restoreOrder: string[]
): Promise<Record<string, number>> {
  const summary: Record<string, number> = {}

  for (const tableName of restoreOrder) {
    summary[tableName] = 0
  }

  // Clear tables in reverse order to respect foreign key constraints
  for (const tableName of [...restoreOrder].reverse()) {
    await truncateTableSupabase(tableName)
  }

  for (const tableName of restoreOrder) {
    const records = ensureArrayRecords(database[tableName])
    const count = await restoreTableSupabase(tableName, records)
    summary[tableName] = count
  }

  return summary
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
    isActive: booleanRequired('employees', row, 'isActive', 'is_active'),
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
    isActive: booleanRequired('users', row, 'isActive', 'is_active'),
    createdAt: dateRequired('users', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('users', row, 'updatedAt', 'updated_at'),
    createdBy: stringOptional(row, 'createdBy', 'created_by')
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
    dateCreated: dateOptional(row, 'dateCreated', 'date_created'),
    createdAt: dateRequired('assets', row, 'createdAt', 'created_at'),
    updatedAt: dateRequired('assets', row, 'updatedAt', 'updated_at')
  })

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

const prismaHandlers: Record<string, PrismaHandler> = {
  sites: {
    delete: async (tx) => (await tx.site.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformSite)
      if (!data.length) return 0
      const result = await tx.site.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  categories: {
    delete: async (tx) => (await tx.category.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformCategory)
      if (!data.length) return 0
      const result = await tx.category.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  departments: {
    delete: async (tx) => (await tx.department.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformDepartment)
      if (!data.length) return 0
      const result = await tx.department.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  employees: {
    delete: async (tx) => (await tx.employee.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformEmployee)
      if (!data.length) return 0
      const result = await tx.employee.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  users: {
    delete: async (tx) => (await tx.user.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformUser)
      if (!data.length) return 0
      const result = await tx.user.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  assets: {
    delete: async (tx) => (await tx.asset.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAsset)
      if (!data.length) return 0
      const result = await tx.asset.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  asset_custom_fields: {
    delete: async (tx) => (await tx.assetCustomField.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAssetCustomField)
      if (!data.length) return 0
      const result = await tx.assetCustomField.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  asset_custom_values: {
    delete: async (tx) => (await tx.assetCustomValue.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformAssetCustomValue)
      if (!data.length) return 0
      const result = await tx.assetCustomValue.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  so_sessions: {
    delete: async (tx) => (await tx.sOSession.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformSOSession)
      if (!data.length) return 0
      const result = await tx.sOSession.createMany({ data, skipDuplicates: true })
      return result.count
    }
  },
  so_asset_entries: {
    delete: async (tx) => (await tx.sOAssetEntry.deleteMany()).count,
    insert: async (tx, records) => {
      const data = records.map(transformSOAssetEntry)
      if (!data.length) return 0
      const result = await tx.sOAssetEntry.createMany({ data, skipDuplicates: true })
      return result.count
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
  const preferPrisma = preferPrismaEngine()
  const attempts: Array<{ engine: RestoreResult['engine']; run: () => Promise<Record<string, number>> }> = []

  if (preferPrisma) {
    attempts.push({ engine: 'prisma', run: () => restoreWithPrisma(database, restoreOrder) })
  }

  if (canUseSupabase()) {
    attempts.push({ engine: 'supabase', run: () => restoreWithSupabase(database, restoreOrder) })
  }

  if (!preferPrisma) {
    attempts.push({ engine: 'prisma', run: () => restoreWithPrisma(database, restoreOrder) })
  }

  if (!attempts.length) {
    throw new Error('No available restore strategy. Configure Supabase credentials or Prisma database URL.')
  }

  const errorMessages: string[] = []

  for (const attempt of attempts) {
    try {
      const summary = await attempt.run()
      const totalRestored = Object.values(summary).reduce((sum, value) => sum + (value ?? 0), 0)
      return { summary, engine: attempt.engine, totalRestored }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[backup/import] ${attempt.engine} restore failed:`, error)
      errorMessages.push(`${attempt.engine}: ${message}`)
    }
  }

  throw new Error(`All restore strategies failed. ${errorMessages.length ? `Details: ${errorMessages.join(' | ')}` : ''}`)
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

    const restoreOrder = resolveRestoreOrder(metadata?.restoreOrder, database)
    const { summary, engine, totalRestored } = await restoreDatabase(database, restoreOrder)

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      importedTables: summary,
      totalRestored,
      engine,
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
