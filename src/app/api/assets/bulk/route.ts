import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface BulkAssetRequest {
  assets: Array<{
    name: string
    noAsset: string
    status?: string
    serialNo?: string
    purchaseDate?: string
    cost?: string
    brand?: string
    model?: string
    site?: string
    category?: string
    department?: string
    pic?: string
  }>
}

export async function POST(
  request: NextRequest
) {
  try {
    const body: BulkAssetRequest = await request.json()
    const { assets } = body

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'Assets array is required' },
        { status: 400 }
      )
    }

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as string[]
    }

    // Process assets one by one to handle duplicates and validation
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      
      try {
        // Validate required fields
        if (!asset.name || !asset.noAsset) {
          results.failedCount++
          results.errors.push(`Asset ${i + 1}: Name and asset number are required`)
          continue
        }

        // Check if asset number already exists
        const existingAsset = await db.asset.findUnique({
          where: { noAsset: asset.noAsset.trim() }
        })

        if (existingAsset) {
          results.failedCount++
          results.errors.push(`Asset ${i + 1}: Asset number "${asset.noAsset}" already exists`)
          continue
        }

        // Prepare asset data
        const assetData: any = {
          name: asset.name.trim(),
          noAsset: asset.noAsset.trim(),
          status: (asset.status?.trim() === "?" ? "" : asset.status?.trim()) || 'Active',
          dateCreated: new Date()
        }

        // Add optional fields if provided (convert "?" to empty string)
        if (asset.serialNo?.trim() && asset.serialNo.trim() !== "?") {
          assetData.serialNo = asset.serialNo.trim()
        }
        if (asset.purchaseDate?.trim() && asset.purchaseDate.trim() !== "?") {
          const purchaseDate = new Date(asset.purchaseDate.trim())
          if (!isNaN(purchaseDate.getTime())) {
            assetData.purchaseDate = purchaseDate
          }
        }
        if (asset.cost?.trim() && asset.cost.trim() !== "?") {
          const cost = parseFloat(asset.cost.replace(/[^0-9.]/g, ''))
          if (!isNaN(cost)) {
            assetData.cost = cost
          }
        }
        if (asset.brand?.trim() && asset.brand.trim() !== "?") {
          assetData.brand = asset.brand.trim()
        }
        if (asset.model?.trim() && asset.model.trim() !== "?") {
          assetData.model = asset.model.trim()
        }
        if (asset.pic?.trim() && asset.pic.trim() !== "?") {
          assetData.pic = asset.pic.trim()
        }

        // Handle relations - find by name or create if needed (convert "?" to empty string)
        if (asset.site?.trim() && asset.site.trim() !== "?") {
          let site = await db.site.findUnique({
            where: { name: asset.site.trim() }
          })
          if (!site) {
            site = await db.site.create({
              data: { name: asset.site.trim() }
            })
          }
          assetData.siteId = site.id
        }

        if (asset.category?.trim() && asset.category.trim() !== "?") {
          let category = await db.category.findUnique({
            where: { name: asset.category.trim() }
          })
          if (!category) {
            category = await db.category.create({
              data: { name: asset.category.trim() }
            })
          }
          assetData.categoryId = category.id
        }

        if (asset.department?.trim() && asset.department.trim() !== "?") {
          let department = await db.department.findUnique({
            where: { name: asset.department.trim() }
          })
          if (!department) {
            department = await db.department.create({
              data: { name: asset.department.trim() }
            })
          }
          assetData.departmentId = department.id
        }

        // Create the asset
        await db.asset.create({
          data: assetData
        })

        results.successCount++
      } catch (error) {
        console.error(`Error creating asset ${i + 1}:`, error)
        results.failedCount++
        results.errors.push(`Asset ${i + 1}: Failed to create asset`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Bulk create assets error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk asset creation' },
      { status: 500 }
    )
  }
}