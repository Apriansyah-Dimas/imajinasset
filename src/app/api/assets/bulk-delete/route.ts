import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { confirmAll } = body

    // Require explicit confirmation for deleting all assets
    if (!confirmAll) {
      return NextResponse.json(
        { error: 'Confirmation required. Set confirmAll to true to delete all assets.' },
        { status: 400 }
      )
    }

    const assetsCount = await db.asset.count()

    if (!assetsCount || assetsCount === 0) {
      return NextResponse.json(
        { message: 'No assets found to delete', deletedCount: 0 },
        { status: 200 }
      )
    }

    await db.asset.deleteMany()

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${assetsCount} assets`,
      deletedCount: assetsCount
    })

  } catch (error) {
    console.error('Bulk delete assets error:', error)
    return NextResponse.json(
      { error: 'Failed to delete assets', details: error.message },
      { status: 500 }
    )
  }
}
