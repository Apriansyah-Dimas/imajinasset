import { NextResponse } from 'next/server'
import { Pool, PoolClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { PostgrestError } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CleanResult = Record<string, number>
const DEFAULT_ADMIN_EMAIL = 'admin@assetso.com'
const DEFAULT_ADMIN_NAME = 'Administrator'
const DEFAULT_ADMIN_PASSWORD = 'admin123'

async function ensureDefaultAdminPg(client: PoolClient) {
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)
  await client.query(
    `
      INSERT INTO users (id, email, name, password, role, isactive, updatedat)
      VALUES (
        COALESCE((SELECT id FROM users WHERE email = $1), gen_random_uuid()),
        $1,
        $2,
        $3,
        'ADMIN',
        true,
        NOW()
      )
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = 'ADMIN',
        isactive = true,
        updatedat = NOW()
    `,
    [DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME, hashedPassword]
  )
}

async function ensureDefaultAdminSupabase() {
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)
  const { error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        email: DEFAULT_ADMIN_EMAIL,
        name: DEFAULT_ADMIN_NAME,
        password: hashedPassword,
        role: 'ADMIN',
        isactive: true
      },
      {
        onConflict: 'email'
      }
    )

  if (error) {
    throw error
  }
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

async function safeDelete(client: PoolClient, query: string, label: string): Promise<number> {
  try {
    const result = await client.query(query)
    return result.rowCount ?? 0
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`Skipping clean for missing table: ${label}`)
      return 0
    }
    throw error
  }
}

const canUsePostgres = () => {
  const url = process.env.DATABASE_URL
  if (!url) return false
  const normalized = url.toLowerCase()
  return !normalized.startsWith('file:') && !normalized.includes('sqlite')
}

const canUseSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

async function cleanWithPostgres(): Promise<CleanResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.')
  }

  const useSsl =
    !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  })

  let client: PoolClient | null = null

  try {
    client = await pool.connect()
    await client.query('BEGIN')

    const results: CleanResult = {}
    results.soAssetEntries = await safeDelete(client, 'DELETE FROM so_asset_entries', 'so_asset_entries')
    results.soSessions = await safeDelete(client, 'DELETE FROM so_sessions', 'so_sessions')
    results.assetCustomValues = await safeDelete(client, 'DELETE FROM asset_custom_values', 'asset_custom_values')
    results.assetCustomFields = await safeDelete(client, 'DELETE FROM asset_custom_fields', 'asset_custom_fields')
    results.assets = await safeDelete(client, 'DELETE FROM assets', 'assets')
    results.employees = await safeDelete(client, 'DELETE FROM employees', 'employees')
    results.users = await safeDelete(client, "DELETE FROM users WHERE role <> 'ADMIN'", 'users non-admin')
    await ensureDefaultAdminPg(client)
    await client.query('COMMIT')
    return results
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.warn('Failed to rollback Postgres clean transaction:', rollbackError)
      }
    }
    throw error
  } finally {
    if (client) {
      client.release()
    }
    await pool.end()
  }
}

async function cleanWithSupabase(): Promise<CleanResult> {
  const results: CleanResult = {}

  const deleteTable = async (table: string, filter?: { column: string; value: unknown }) => {
    let query = supabaseAdmin.from(table).delete()
    if (filter) {
      query = query.neq(filter.column, filter.value)
    } else {
      query = query.not('id', 'is', null)
    }
    const { error: deleteError, count } = await query.select('id', { count: 'exact', head: true })
    if (deleteError) {
      if (isMissingTableError(deleteError)) {
        console.warn(`Skipping clean for missing table via Supabase: ${table}`)
        return 0
      }
      throw deleteError
    }
    return count ?? 0
  }

  results.soAssetEntries = await deleteTable('so_asset_entries')
  results.soSessions = await deleteTable('so_sessions')
  results.assetCustomValues = await deleteTable('asset_custom_values')
  results.assetCustomFields = await deleteTable('asset_custom_fields')
  results.assets = await deleteTable('assets')
  results.employees = await deleteTable('employees')
  results.users = await deleteTable('users', { column: 'role', value: 'ADMIN' })

  await ensureDefaultAdminSupabase()

  return results
}

async function cleanWithPrisma(): Promise<CleanResult> {
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)

  return db.$transaction(async (tx) => {
    const summary: CleanResult = {
      soAssetEntries: (await tx.sOAssetEntry.deleteMany()).count,
      soSessions: (await tx.sOSession.deleteMany()).count,
      assetCustomValues: (await tx.assetCustomValue.deleteMany()).count,
      assetCustomFields: (await tx.assetCustomField.deleteMany()).count,
      assets: (await tx.asset.deleteMany()).count,
      employees: (await tx.employee.deleteMany()).count,
      users: (await tx.user.deleteMany({
        where: {
          role: { not: 'ADMIN' }
        }
      })).count
    }

    await tx.user.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: {
        name: DEFAULT_ADMIN_NAME,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        name: DEFAULT_ADMIN_NAME,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    })

    return summary
  })
}

export async function POST() {
  try {
    if (canUsePostgres()) {
      try {
        const summary = await cleanWithPostgres()
        return NextResponse.json({
          success: true,
          cleanedAt: new Date().toISOString(),
          summary,
          engine: 'pg'
        })
      } catch (pgError) {
        console.warn('Postgres clean failed, attempting fallback:', pgError)
      }
    }

    if (canUseSupabase()) {
      try {
        const summary = await cleanWithSupabase()
        return NextResponse.json({
          success: true,
          cleanedAt: new Date().toISOString(),
          summary,
          engine: 'supabase'
        })
      } catch (supabaseError) {
        console.warn('Supabase clean failed, attempting Prisma fallback:', supabaseError)
      }
    } else {
      console.warn('Supabase configuration missing, attempting Prisma clean.')
    }

    const summary = await cleanWithPrisma()
    return NextResponse.json({
      success: true,
      cleanedAt: new Date().toISOString(),
      summary,
      engine: 'prisma'
    })
  } catch (error) {
    console.error('Data clean-up failed:', error)
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error occurred.'
    return NextResponse.json(
      { error: `Failed to clean data: ${message}` },
      { status: 500 }
    )
  }
}
