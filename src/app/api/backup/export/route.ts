import { NextResponse } from 'next/server'
import archiver from 'archiver'
import { promises as fs } from 'node:fs'
import { PassThrough, Readable } from 'node:stream'
import path from 'node:path'
import crypto from 'node:crypto'
import { Pool, PoolClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TABLES_TO_EXPORT = [
  'users',
  'sites',
  'categories',
  'departments',
  'employees',
  'assets',
  'asset_custom_fields',
  'asset_custom_values',
  'so_sessions',
  'so_asset_entries',
  'logs',
  'backups'
]

type TableDump = Record<string, unknown[]>

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
    message.includes('relation') && message.includes('not found')
  ) {
    return true
  }

  if ((error as Partial<PostgrestError>).code) {
    const code = (error as Partial<PostgrestError>).code!.toUpperCase()
    if (code === '42P01' || code === 'PGRST116') {
      return true
    }
  }

  const details = (error as Partial<PostgrestError>).details?.toLowerCase() ?? ''
  const hint = (error as Partial<PostgrestError>).hint?.toLowerCase() ?? ''
  return details.includes('does not exist') || hint.includes('does not exist')
}

async function fetchTableRowsPg(client: PoolClient, table: string): Promise<unknown[]> {
  try {
    const result = await client.query(`SELECT * FROM ${table}`)
    return result.rows ?? []
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

async function fetchTableRowsSupabase(table: string): Promise<unknown[]> {
  const chunkSize = 1000
  let from = 0
  const rows: unknown[] = []

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*', { head: false })
      .range(from, from + chunkSize - 1)

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(`Skipping missing table during export: ${table}`, error)
        return []
      }
      console.error(`Failed to export table ${table} via Supabase`, error)
      throw new Error(error.message ?? `Unable to export table ${table}`)
    }

    if (!data || data.length === 0) {
      break
    }

    rows.push(...data)

    if (data.length < chunkSize) {
      break
    }

    from += chunkSize
  }

  return rows
}

async function readPackageVersion() {
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
  return packageJson.version ?? '0.0.0'
}

async function exportUsingPg() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Cannot access database using direct connection.')
  }

  const useSsl = !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  })
  const client = await pool.connect()
  return { pool, client }
}

async function buildDumpWithPg(client: PoolClient) {
  const databaseDump: TableDump = {}
  const tableCounts: Record<string, number> = {}
  let totalRecords = 0

  for (const table of TABLES_TO_EXPORT) {
    const rows = await fetchTableRowsPg(client, table)
    databaseDump[table] = rows
    tableCounts[table] = rows.length
    totalRecords += rows.length
  }

  return { databaseDump, tableCounts, totalRecords }
}

async function buildDumpWithSupabase() {
  const databaseDump: TableDump = {}
  const tableCounts: Record<string, number> = {}
  let totalRecords = 0

  for (const table of TABLES_TO_EXPORT) {
    const rows = await fetchTableRowsSupabase(table)
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
  const archiveName = `assetso-backup-${normalizedDate}.zip`
  const archiveLabel = `assetso-backup-${normalizedDate}`

  let pool: Pool | null = null
  let client: PoolClient | null = null

  try {
    let databaseDump: TableDump
    let tableCounts: Record<string, number>
    let totalRecords: number
    let strategy: 'pg' | 'supabase' = 'pg'

    try {
      const connection = await exportUsingPg()
      pool = connection.pool
      client = connection.client
      const dump = await buildDumpWithPg(connection.client)
      databaseDump = dump.databaseDump
      tableCounts = dump.tableCounts
      totalRecords = dump.totalRecords
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('Falling back to Supabase API for export due to error:', errorMessage)
      if (client) {
        client.release()
        client = null
      }
      if (pool) {
        await pool.end()
        pool = null
      }

      const dump = await buildDumpWithSupabase()
      databaseDump = dump.databaseDump
      tableCounts = dump.tableCounts
      totalRecords = dump.totalRecords
      strategy = 'supabase'
    }

    const databaseJsonString = JSON.stringify(databaseDump, null, 2)
    const databaseChecksum = crypto.createHash('sha256').update(databaseJsonString).digest('hex')

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
      notes:
        'Generated by /api/backup/export. Includes relational data (users, assets, employees, SO sessions, logs). Media uploads are not bundled in this export.',
      engine: strategy
    }

    archive.append(databaseJsonString, { name: 'database.json' })
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

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
  } finally {
    if (client) {
      client.release()
    }
    if (pool) {
      await pool.end()
    }
  }
}
