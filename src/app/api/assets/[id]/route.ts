import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data: asset, error } = await supabaseAdmin
      .from('assets')
      .select(`
        *,
        sites (id, name),
        categories (id, name),
        departments (id, name),
        employees (
          id,
          employee_id,
          name,
          email,
          department,
          position,
          isactive
        )
      `)
      .eq('id', id)
      .single()

    if (error || !asset) {
      console.error('Error fetching asset:', error)
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Transform the data to match expected format
    const transformedAsset = {
      ...asset,
      site: asset.sites,
      category: asset.categories,
      department: asset.departments,
      employee: asset.employees ? {
        ...asset.employees,
        employeeId: asset.employees.employee_id
      } : null,
      sites: undefined,
      categories: undefined,
      departments: undefined,
      employees: undefined
    }

    return NextResponse.json(transformedAsset)
  } catch (error) {
    console.error('Asset GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get original asset for comparison
    const { data: originalAsset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select(`
        *,
        sites (id, name),
        categories (id, name),
        departments (id, name),
        employees (
          id,
          employee_id,
          name,
          email,
          department,
          position,
          isactive
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !originalAsset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Prepare update data with proper column names (snake_case for Supabase)
    const updateData: any = {
      name: body.name,
      no_asset: body.noAsset,
      status: body.status,
      serial_no: body.serialNo || null,
      purchase_date: body.purchaseDate ? new Date(body.purchaseDate) : null,
      cost: body.cost ? parseFloat(body.cost) : null,
      brand: body.brand || null,
      model: body.model || null,
      site_id: body.siteId || null,
      category_id: body.categoryId || null,
      department_id: body.departmentId || null,
    }

    // Handle PIC updates properly
    if (body.picId) {
      // If picId is provided, use it and set pic to null
      updateData.pic_id = body.picId
      updateData.pic = null
    } else if (body.pic !== undefined && body.pic !== null && body.pic !== '') {
      // If pic (string) is provided, use it and set picId to null
      updateData.pic = body.pic
      updateData.pic_id = null
    } else {
      // Clear both if empty value provided
      updateData.pic = null
      updateData.pic_id = null
    }

    // Handle notes field (for additional information)
    if (body.notes !== undefined) {
      updateData.notes = body.notes || null
    }

    if (Object.prototype.hasOwnProperty.call(body, 'imageUrl')) {
      updateData.image_url = body.imageUrl ? body.imageUrl : null
    }

    const { data: asset, error: updateError } = await supabaseAdmin
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        sites (id, name),
        categories (id, name),
        departments (id, name),
        employees (
          id,
          employee_id,
          name,
          email,
          department,
          position,
          isactive
        )
      `)
      .single()

    if (updateError) {
      console.error('Asset PUT error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update asset', details: updateError.message },
        { status: 500 }
      )
    }

    // Transform the data to match expected format
    const transformedAsset = {
      ...asset,
      site: asset.sites,
      category: asset.categories,
      department: asset.departments,
      employee: asset.employees ? {
        ...asset.employees,
        employeeId: asset.employees.employee_id
      } : null,
      sites: undefined,
      categories: undefined,
      departments: undefined,
      employees: undefined,
      noAsset: asset.no_asset,
      serialNo: asset.serial_no,
      purchaseDate: asset.purchase_date,
      imageUrl: asset.image_url,
      picId: asset.pic_id,
      siteId: asset.site_id,
      categoryId: asset.category_id,
      departmentId: asset.department_id
    }

    return NextResponse.json(transformedAsset)
  } catch (error) {
    console.error('Asset PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update asset', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get asset details before deletion
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('assets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Asset DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Asset DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
