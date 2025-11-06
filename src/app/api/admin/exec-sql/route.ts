import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { sql } = await request.json()
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      )
    }
    
    const trimmed = sql.trim().toLowerCase()
    const isSelect = trimmed.startsWith('select')

    if (isSelect) {
      const data = await db.$queryRawUnsafe(sql)
      return NextResponse.json({ success: true, data })
    }

    const result = await db.$executeRawUnsafe(sql)
    return NextResponse.json({ success: true, affectedRows: Number(result) })
  } catch (error) {
    console.error('Error executing SQL:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
