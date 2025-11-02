import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get total assets count using different methods
    const countMethod1 = await db.asset.count()
    
    const countMethod2 = await db.asset.findMany({
      select: { id: true }
    })
    
    const countMethod3 = await db.$queryRaw`SELECT COUNT(*) as count FROM Asset`
    
    // Get sample of assets
    const sampleAssets = await db.asset.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        noAsset: true,
        dateCreated: true
      },
      orderBy: { dateCreated: 'desc' }
    })
    
    return NextResponse.json({
      countMethod1,
      countMethod2: countMethod2.length,
      countMethod3: countMethod3[0]?.count || 0,
      sampleAssets,
      message: "Asset count verification"
    })
  } catch (error) {
    console.error('Asset count verification error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}