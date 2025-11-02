import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get total assets count
    const { count: totalAssets } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })

    console.log('Dashboard API - Total Assets:', totalAssets)

    // Get assets by site
    const { data: assetsBySiteData } = await supabaseAdmin
      .from('assets')
      .select(`
        site_id,
        sites (
          id,
          name
        )
      `)
      .not('site_id', 'is', null)

    // Group by site
    const assetsBySite = (assetsBySiteData || []).reduce((acc, item) => {
      const siteName = item.sites?.name || 'Unknown'
      const existing = acc.find(site => site.siteId === item.site_id)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          siteId: item.site_id,
          name: siteName,
          value: 1
        })
      }
      return acc
    }, [] as { siteId: string; name: string; value: number }[])

    // Get assets by category
    const { data: assetsByCategoryData } = await supabaseAdmin
      .from('assets')
      .select(`
        category_id,
        categories (
          id,
          name
        )
      `)
      .not('category_id', 'is', null)

    // Group by category
    const assetsByCategory = (assetsByCategoryData || []).reduce((acc, item) => {
      const categoryName = item.categories?.name || 'Unknown'
      const existing = acc.find(cat => cat.categoryId === item.category_id)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          categoryId: item.category_id,
          name: categoryName,
          value: 1
        })
      }
      return acc
    }, [] as { categoryId: string; name: string; value: number }[])

    // Get assets by department
    const { data: assetsByDepartmentData } = await supabaseAdmin
      .from('assets')
      .select(`
        department_id,
        departments (
          id,
          name
        )
      `)
      .not('department_id', 'is', null)

    // Group by department
    const assetsByDepartment = (assetsByDepartmentData || []).reduce((acc, item) => {
      const departmentName = item.departments?.name || 'Unknown'
      const existing = acc.find(dept => dept.departmentId === item.department_id)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          departmentId: item.department_id,
          name: departmentName,
          value: 1
        })
      }
      return acc
    }, [] as { departmentId: string; name: string; value: number }[])

    // Get total cost by category (using raw SQL since Supabase doesn't have SUM in client)
    const { data: totalCostByCategoryData } = await supabaseAdmin
      .from('assets')
      .select(`
        category_id,
        cost,
        categories (
          id,
          name
        )
      `)
      .not('cost', 'is', null)
      .not('category_id', 'is', null)

    // Group and sum by category
    const totalCostByCategory = (totalCostByCategoryData || []).reduce((acc, item) => {
      const categoryName = item.categories?.name || 'Unknown'
      const existing = acc.find(cat => cat.categoryId === item.category_id)
      if (existing) {
        existing.cost += Number(item.cost) || 0
        existing.count += 1
      } else {
        acc.push({
          categoryId: item.category_id,
          name: categoryName,
          cost: Number(item.cost) || 0,
          count: 1
        })
      }
      return acc
    }, [] as { categoryId: string; name: string; cost: number; count: number }[])

    // Format total cost data
    const formattedTotalCostByCategory = totalCostByCategory.map(item => ({
      name: item.name,
      value: item.count,
      cost: item.cost
    }))

    return NextResponse.json({
      totalAssets: totalAssets || 0,
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