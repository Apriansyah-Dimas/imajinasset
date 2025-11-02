import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const picName = searchParams.get('name')

    if (!picName) {
      return NextResponse.json(
        { error: 'PIC name is required' },
        { status: 400 }
      )
    }

    // Check if any assets are using this PIC
    const assetCount = await db.asset.count({
      where: {
        pic: picName
      }
    })

    return NextResponse.json({
      isUsed: assetCount > 0,
      assetCount
    })
  } catch (error) {
    console.error('Check PIC usage error:', error)
    return NextResponse.json(
      { error: 'Failed to check PIC usage' },
      { status: 500 }
    )
  }
}