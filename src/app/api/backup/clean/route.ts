import { NextResponse } from 'next/server'
import { Pool, PoolClient } from 'pg'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CleanResult = Record<string, number>
const DEFAULT_ADMIN_EMAIL = 'admin@assetso.com'
const DEFAULT_ADMIN_NAME = 'Administrator'
const DEFAULT_ADMIN_PASSWORD = 'admin123'

async function ensureDefaultAdminPg(client: PoolClient) {
  try {
    console.log('[CLEAN] Creating default admin user...')
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)
    console.log('[CLEAN] Admin password hashed')
    
    const result = await client.query(
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
    
    console.log('[CLEAN] Default admin user created/updated successfully')
    return result
  } catch (error) {
    console.error('[CLEAN] Failed to create default admin user:', error)
    console.error('[CLEAN] Admin creation error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      detail: (error as any)?.detail
    })
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

  const code = (error as { code?: string }).code?.toUpperCase()
  const details = (error as { details?: string }).details?.toLowerCase() ?? ''
  return code === '42P01' || code === 'PGRST116' || details.includes('does not exist')
}

async function safeDelete(client: any, query: string, label: string): Promise<number> {
  try {
    console.log(`[CLEAN] Attempting to clean table: ${label}`)
    console.log(`[CLEAN] Query: ${query}`)
    console.log(`[CLEAN] Client type:`, typeof client)
    
    // Check if it's a Prisma transaction client
    if (client.$queryRaw && typeof client.$queryRaw === 'function') {
      console.log(`[CLEAN] Using Prisma $queryRaw method`)
      const result = await client.$queryRaw`${query}`
      const count = Array.isArray(result) ? result.length : 0
      console.log(`[CLEAN] Successfully deleted ${count} rows from ${label} using Prisma`)
      return count
    }
    
    // Check if it's a PostgreSQL client
    if (client.query && typeof client.query === 'function') {
      console.log(`[CLEAN] Using PostgreSQL client.query method`)
      const result = await client.query(query)
      const count = result.rowCount ?? 0
      console.log(`[CLEAN] Successfully deleted ${count} rows from ${label} using PostgreSQL`)
      return count
    }
    
    console.error(`[CLEAN] Unknown client type, available methods:`, Object.getOwnPropertyNames(client))
    throw new Error(`Database client does not have a supported query method. Available methods: ${Object.getOwnPropertyNames(client).join(', ')}`)
  } catch (error) {
    console.error(`[CLEAN] Error cleaning table ${label}:`, error)
    console.error(`[CLEAN] Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      hint: (error as any)?.hint,
      query: query,
      clientType: typeof client
    })
    if (isMissingTableError(error)) {
      console.warn(`[CLEAN] Skipping clean for missing table: ${label}`)
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


async function cleanWithPostgres(): Promise<CleanResult> {
  console.log('[CLEAN] Checking database configuration...')
  
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.error('[CLEAN] DATABASE_URL is not configured')
    console.error('[CLEAN] Environment check:', {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_TYPE: process.env.DATABASE_URL ?
        (process.env.DATABASE_URL.includes('postgresql') ? 'postgresql' :
         process.env.DATABASE_URL.includes('sqlite') ? 'sqlite' : 'unknown') : 'missing'
    })
    throw new Error('DATABASE_URL is not configured.')
  }

  console.log('[CLEAN] DATABASE_URL found:', 'configured')
  console.log('[CLEAN] Environment check:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing',
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_TYPE: process.env.DATABASE_URL ?
      (process.env.DATABASE_URL.includes('postgresql') ? 'postgresql' :
       process.env.DATABASE_URL.includes('sqlite') ? 'sqlite' : 'unknown') : 'missing'
  })
  
  const useSsl =
    !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
  console.log('[CLEAN] SSL configuration:', useSsl ? 'enabled' : 'disabled')
  
  console.log('[CLEAN] Creating database pool...')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  })

  let client: PoolClient | null = null

  try {
    console.log('[CLEAN] Attempting to connect to database...')
    client = await pool.connect()
    console.log('[CLEAN] Database connection successful')
    
    // Test connection with a simple query
    console.log('[CLEAN] Testing database connection...')
    const testResult = await client.query('SELECT 1 as test')
    console.log('[CLEAN] Database connection test result:', testResult)
    console.log('[CLEAN] Database connection test passed')
    
    await client.query('BEGIN')
    console.log('[CLEAN] Transaction started')

    console.log('[CLEAN] Starting PostgreSQL clean process')
    const results: CleanResult = {}
    
    try {
      console.log('[CLEAN] Beginning transaction')
      await client.query('BEGIN')
      
      // Validate database state before cleaning
      console.log('[CLEAN] Validating database state before cleaning...')
      const validationQuery = `
        SELECT
          (SELECT COUNT(*) as count FROM so_asset_entries) as so_asset_entries_count,
          (SELECT COUNT(*) as count FROM so_sessions) as so_sessions_count,
          (SELECT COUNT(*) as count FROM asset_custom_values) as asset_custom_values_count,
          (SELECT COUNT(*) as count FROM asset_custom_fields) as asset_custom_fields_count,
          (SELECT COUNT(*) as count FROM assets) as assets_count,
          (SELECT COUNT(*) as count FROM employees) as employees_count,
          (SELECT COUNT(*) as count FROM users) as users_count,
          (SELECT COUNT(*) as count FROM logs) as logs_count,
          (SELECT COUNT(*) as count FROM backups) as backups_count
      `
      
      const validation = await client.query(validationQuery)
      console.log('[CLEAN] Database state before clean:', {
        soAssetEntries: validation.rows[0]?.so_asset_entries_count || 0,
        soSessions: validation.rows[0]?.so_sessions_count || 0,
        assetCustomValues: validation.rows[0]?.asset_custom_values_count || 0,
        assetCustomFields: validation.rows[0]?.asset_custom_fields_count || 0,
        assets: validation.rows[0]?.assets_count || 0,
        employees: validation.rows[0]?.employees_count || 0,
        users: validation.rows[0]?.users_count || 0,
        logs: validation.rows[0]?.logs_count || 0,
        backups: validation.rows[0]?.backups_count || 0
      })

      results.soAssetEntries = await safeDelete(client, 'DELETE FROM so_asset_entries', 'so_asset_entries')
      results.soSessions = await safeDelete(client, 'DELETE FROM so_sessions', 'so_sessions')
      results.assetCustomValues = await safeDelete(client, 'DELETE FROM asset_custom_values', 'asset_custom_values')
      results.assetCustomFields = await safeDelete(client, 'DELETE FROM asset_custom_fields', 'asset_custom_fields')
      results.assets = await safeDelete(client, 'DELETE FROM assets', 'assets')
      results.employees = await safeDelete(client, 'DELETE FROM employees', 'employees')
      results.users = await safeDelete(client, "DELETE FROM users WHERE role <> 'ADMIN'", 'users non-admin')
      results.logs = await safeDelete(client, 'DELETE FROM logs', 'logs')
      results.backups = await safeDelete(client, 'DELETE FROM backups', 'backups')
      
      console.log('[CLEAN] Creating default admin user')
      await ensureDefaultAdminPg(client)
      
      console.log('[CLEAN] Committing transaction')
      await client.query('COMMIT')
      
      // Validate database state after cleaning
      const postValidation = await client.query(validationQuery)
      console.log('[CLEAN] Database state after clean:', {
        soAssetEntries: postValidation.rows[0]?.so_asset_entries_count || 0,
        soSessions: postValidation.rows[0]?.so_sessions_count || 0,
        assetCustomValues: postValidation.rows[0]?.asset_custom_values_count || 0,
        assetCustomFields: postValidation.rows[0]?.asset_custom_fields_count || 0,
        assets: postValidation.rows[0]?.assets_count || 0,
        employees: postValidation.rows[0]?.employees_count || 0,
        users: postValidation.rows[0]?.users_count || 0,
        logs: postValidation.rows[0]?.logs_count || 0,
        backups: postValidation.rows[0]?.backups_count || 0
      })
      
      console.log('[CLEAN] PostgreSQL clean completed successfully:', results)
      return results
    } catch (error) {
      console.error('[CLEAN] PostgreSQL clean failed, attempting rollback:', error)
      try {
        await client.query('ROLLBACK')
        console.log('[CLEAN] Transaction rolled back')
      } catch (rollbackError) {
        console.error('[CLEAN] Rollback failed:', rollbackError)
      }
      throw error
    }
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


async function cleanWithPrisma(): Promise<CleanResult> {
  console.log('[CLEAN] Starting Prisma clean process')
  console.log('[CLEAN] Testing database connection...')
  
  try {
    // Test database connection first
    await db.$queryRaw`SELECT 1`
    console.log('[CLEAN] Database connection test passed')
  } catch (error) {
    console.error('[CLEAN] Database connection test failed:', error)
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  console.log('[CLEAN] Hashing default admin password...')
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)
  console.log('[CLEAN] Admin password hashed successfully')

  return db.$transaction(async (tx) => {
    console.log('[CLEAN] Starting Prisma clean process')
    const summary: CleanResult = {}
    
    try {
      console.log('[CLEAN] Deleting so_asset_entries...')
      summary.soAssetEntries = (await tx.sOAssetEntry.deleteMany()).count
      console.log(`[CLEAN] Deleted ${summary.soAssetEntries} so_asset_entries`)
      
      console.log('[CLEAN] Deleting so_sessions...')
      summary.soSessions = (await tx.sOSession.deleteMany()).count
      console.log(`[CLEAN] Deleted ${summary.soSessions} so_sessions`)
      
      console.log('[CLEAN] Deleting asset_custom_values...')
      summary.assetCustomValues = (await tx.assetCustomValue.deleteMany()).count
      console.log(`[CLEAN] Deleted ${summary.assetCustomValues} asset_custom_values`)
      
      console.log('[CLEAN] Deleting asset_custom_fields...')
      summary.assetCustomFields = (await tx.assetCustomField.deleteMany()).count
      console.log(`[CLEAN] Deleted ${summary.assetCustomFields} asset_custom_fields`)
      
      console.log('[CLEAN] Deleting assets...')
      summary.assets = (await tx.asset.deleteMany()).count
      console.log(`[CLEAN] Deleted ${summary.assets} assets`)
      
      console.log('[CLEAN] Deleting employees...')
      summary.employees = (await tx.employee.deleteMany()).count
      console.log(`[CLEAN] Deleted ${summary.employees} employees`)
      
      console.log('[CLEAN] Deleting non-admin users...')
      summary.users = (await tx.user.deleteMany({
        where: {
          role: { not: 'ADMIN' }
        }
      })).count
      console.log(`[CLEAN] Deleted ${summary.users} non-admin users`)
      
      console.log('[CLEAN] Deleting logs...')
      try {
        const logsResult = await tx.$queryRaw`DELETE FROM logs`
        summary.logs = Array.isArray(logsResult) ? logsResult.length : 0
        console.log(`[CLEAN] Deleted ${summary.logs} logs`)
      } catch (error) {
        console.warn('[CLEAN] Failed to delete logs, table might not exist:', error)
        summary.logs = 0
      }
      
      console.log('[CLEAN] Deleting backups...')
      try {
        const backupsResult = await tx.$queryRaw`DELETE FROM backups`
        summary.backups = Array.isArray(backupsResult) ? backupsResult.length : 0
        console.log(`[CLEAN] Deleted ${summary.backups} backups`)
      } catch (error) {
        console.warn('[CLEAN] Failed to delete backups, table might not exist:', error)
        summary.backups = 0
      }

      console.log('[CLEAN] Creating default admin user...')
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
      console.log('[CLEAN] Default admin user created/updated')

      console.log('[CLEAN] Prisma clean completed successfully:', summary)
      return summary
    } catch (error) {
      console.error('[CLEAN] Prisma clean failed:', error)
      console.error('[CLEAN] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  })
}

export async function POST() {
  console.log('[CLEAN] Clean data request received')
  
  try {
    if (canUsePostgres()) {
      console.log('[CLEAN] Using PostgreSQL clean method')
      try {
        const summary = await cleanWithPostgres()
        console.log('[CLEAN] PostgreSQL clean completed successfully')
        return NextResponse.json({
          success: true,
          cleanedAt: new Date().toISOString(),
          summary,
          engine: 'pg'
        })
      } catch (pgError) {
        console.error('[CLEAN] PostgreSQL clean failed, attempting fallback:', pgError)
        console.error('[CLEAN] PostgreSQL error details:', {
          message: pgError instanceof Error ? pgError.message : String(pgError),
          stack: pgError instanceof Error ? pgError.stack : undefined,
          code: (pgError as any)?.code,
          detail: (pgError as any)?.detail,
          hint: (pgError as any)?.hint
        })
      }
    }

    console.log('[CLEAN] Using Prisma clean method')
    const summary = await cleanWithPrisma()
    console.log('[CLEAN] Prisma clean completed successfully')
    return NextResponse.json({
      success: true,
      cleanedAt: new Date().toISOString(),
      summary,
      engine: 'prisma'
    })
  } catch (error) {
    console.error('[CLEAN] Data clean-up failed:', error)
    console.error('[CLEAN] Full error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      hint: (error as any)?.hint
    })
    
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error occurred.'
    
    console.error('[CLEAN] Returning error response:', message)
    return NextResponse.json(
      { error: `Failed to clean data: ${message}` },
      { status: 500 }
    )
  }
}
