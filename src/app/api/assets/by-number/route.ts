import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url)
    const number = searchParams.get('number')
    
    if (!number) {
      return NextResponse.json(
        { error: 'Asset number is required' },
        { status: 400 }
      )
    }
    
    // Decode the URL-encoded asset number
    const decodedNumber = decodeURIComponent(number)
    console.log('Searching for asset with number:', decodedNumber)
    
    // Try exact match first
    console.log('Trying exact match for:', decodedNumber)
    let asset = await db.asset.findUnique({
      where: { noAsset: decodedNumber },
      include: {
        site: {
          select: { name: true, id: true }
        },
        category: {
          select: { name: true, id: true }
        },
        department: {
          select: { name: true, id: true }
        }
      }
    })

    // If not found, try case-insensitive search
    if (!asset) {
      console.log('Trying case-insensitive search for:', decodedNumber)
      asset = await db.asset.findFirst({
        where: { 
          noAsset: {
            equals: decodedNumber,
            mode: 'insensitive'
          }
        },
        include: {
          site: {
            select: { name: true, id: true }
          },
          category: {
            select: { name: true, id: true }
          },
          department: {
            select: { name: true, id: true }
          }
        }
      })
    }

    // If still not found and the number contains dots, try without dots
    if (!asset && decodedNumber.includes('.')) {
      const withoutDots = decodedNumber.replace(/\./g, '')
      console.log('Trying without dots:', withoutDots)
      asset = await db.asset.findFirst({
        where: { 
          noAsset: {
            equals: withoutDots,
            mode: 'insensitive'
          }
        },
        include: {
          site: {
            select: { name: true, id: true }
          },
          category: {
            select: { name: true, id: true }
          },
          department: {
            select: { name: true, id: true }
          }
        }
      })
    }

    // If still not found, try contains search (for partial matches)
    if (!asset) {
      console.log('Trying contains search for:', decodedNumber)
      asset = await db.asset.findFirst({
        where: { 
          noAsset: {
            contains: decodedNumber,
            mode: 'insensitive'
          }
        },
        include: {
          site: {
            select: { name: true, id: true }
          },
          category: {
            select: { name: true, id: true }
          },
          department: {
            select: { name: true, id: true }
          }
        }
      })
    }

    if (asset) {
      console.log('Found asset:', asset.noAsset, 'ID:', asset.id)
    } else {
      console.log('Asset not found after all search attempts')
    }

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Asset search error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}