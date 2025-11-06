import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const site = await db.site.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        province: body.province || null,
        postalCode: body.postalCode || null,
        country: body.country || null,
        phone: body.phone || null,
        email: body.email || null
      }
    })

    if (!site) {
      console.error('Site PUT error: site not found')
      return NextResponse.json(
        { error: 'Failed to update site' },
        { status: 500 }
      )
    }

    return NextResponse.json(site)
  } catch (error) {
    console.error('Site PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if site is being used by any assets
    const { id } = await params

    const assetsCount = await db.asset.count({
      where: { siteId: id }
    })

    if (assetsCount && assetsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete site: it is being used by assets' },
        { status: 400 }
      )
    }

    try {
      await db.site.delete({
        where: { id }
      })
    } catch (deleteError) {
      console.error('Site DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete site' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Site DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 }
    )
  }
}
