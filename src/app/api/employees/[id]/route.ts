import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // Get employee with asset count
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        assets(count)
      `)
      .eq('id', id)
      .single()

    if (error || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Transform to match expected format (camelCase)
    const transformedEmployee = {
      ...employee,
      employeeId: employee.employee_id,
      joinDate: employee.join_date,
      _count: {
        assets: employee.assets?.[0]?.count || 0
      }
    }

    return NextResponse.json(transformedEmployee)
  } catch (error) {
    console.error('Employee GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    const transformedBody = {
      employee_id: body.employeeId,
      name: body.name,
      email: body.email || null,
      department: body.department || null,
      position: body.position || null,
      join_date: body.joinDate ? new Date(body.joinDate) : null,
      isactive: body.isactive !== undefined ? body.isactive : undefined,
      updatedat: new Date().toISOString()
    }

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .update(transformedBody)
      .eq('id', id)
      .select()
      .single()

    if (error || !employee) {
      console.error('Employee PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update employee' },
        { status: 500 }
      )
    }

    // Transform to match expected format (camelCase)
    const transformedEmployee = {
      ...employee,
      employeeId: employee.employee_id,
      joinDate: employee.join_date
    }

    return NextResponse.json(transformedEmployee)
  } catch (error) {
    console.error('Employee PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // First, detach employee from any assets before deletion
    const { error: updateError } = await supabaseAdmin
      .from('assets')
      .update({
        pic_id: null,
        updatedat: new Date().toISOString()
      })
      .eq('pic_id', id)

    if (updateError) {
      console.error('Error detaching employee from assets:', updateError)
      return NextResponse.json(
        { error: 'Failed to detach employee from assets' },
        { status: 500 }
      )
    }

    // Then delete the employee
    const { error: deleteError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Employee DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete employee' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Employee deleted successfully. Related assets were updated.' })
  } catch (error) {
    console.error('Employee DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
