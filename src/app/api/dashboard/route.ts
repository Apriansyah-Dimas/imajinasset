import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get total assets count
    const totalAssets = await db.asset.count()

    console.log('Dashboard API - Total Assets:', totalAssets)

    // Get assets by site
    const assetsBySiteData = await db.asset.groupBy({
      by: ['siteId'],
      where: { siteId: { not: null } },
      _count: { siteId: true }
    })

    // Get site details
    const siteIds = assetsBySiteData.map(item => item.siteId!).filter(Boolean)
    const sites = siteIds.length > 0
      ? await db.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, name: true } })
      : []

    const siteMap = new Map(sites.map(site => [site.id, site.name]))

    const assetsBySite = assetsBySiteData.map(item => ({
      siteId: item.siteId!,
      name: siteMap.get(item.siteId!) || 'Unknown',
      value: item._count.siteId
    }))

    // Get assets by category
    const assetsByCategoryData = await db.asset.groupBy({
      by: ['categoryId'],
      where: { categoryId: { not: null } },
      _count: { categoryId: true }
    })

    // Get category details
    const categoryIds = assetsByCategoryData.map(item => item.categoryId!).filter(Boolean)
    const categories = categoryIds.length > 0
      ? await db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
      : []

    const categoryMap = new Map(categories.map(category => [category.id, category.name]))

    const assetsByCategory = assetsByCategoryData.map(item => ({
      categoryId: item.categoryId!,
      name: categoryMap.get(item.categoryId!) || 'Unknown',
      value: item._count.categoryId
    }))

    // Get assets by department
    const assetsByDepartmentData = await db.asset.groupBy({
      by: ['departmentId'],
      where: { departmentId: { not: null } },
      _count: { departmentId: true }
    })

    // Get department details
    const departmentIds = assetsByDepartmentData.map(item => item.departmentId!).filter(Boolean)
    const departments = departmentIds.length > 0
      ? await db.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, name: true } })
      : []

    const departmentMap = new Map(departments.map(department => [department.id, department.name]))

    const assetsByDepartment = assetsByDepartmentData.map(item => ({
      departmentId: item.departmentId!,
      name: departmentMap.get(item.departmentId!) || 'Unknown',
      value: item._count.departmentId
    }))

    // Get total cost by category
    const assetsWithCost = await db.asset.groupBy({
      by: ['categoryId'],
      where: {
        cost: { not: null },
        categoryId: { not: null }
      },
      _sum: { cost: true },
      _count: { categoryId: true }
    })

    // Get category details for cost data
    const costCategoryIds = assetsWithCost.map(item => item.categoryId!).filter(Boolean)
    const costCategories = costCategoryIds.length > 0
      ? await db.category.findMany({ where: { id: { in: costCategoryIds } }, select: { id: true, name: true } })
      : []

    const costCategoryMap = new Map(costCategories.map(category => [category.id, category.name]))

    const totalCostByCategory = assetsWithCost.map(item => ({
      categoryId: item.categoryId!,
      name: costCategoryMap.get(item.categoryId!) || 'Unknown',
      cost: item._sum.cost || 0,
      count: item._count.categoryId
    }))

    // Format total cost data
    const formattedTotalCostByCategory = totalCostByCategory.map(item => ({
      name: item.name,
      value: item.count,
      cost: item.cost
    }))

    return NextResponse.json({
      totalAssets,
      totalCostByCategory: formattedTotalCostByCategory,
      assetsBySite,
      assetsByCategory,
      assetsByDepartment
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}