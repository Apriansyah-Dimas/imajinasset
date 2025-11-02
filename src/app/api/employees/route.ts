import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Employees GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    // Transform to match expected format (camelCase)
    const transformedEmployees = (employees || []).map(employee => ({
      ...employee,
      employeeId: employee.employee_id,
      joinDate: employee.join_date
    }))

    return NextResponse.json(transformedEmployees)
  } catch (error) {
    console.error('Employees GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const transformedBody = {
      employee_id: body.employeeId,
      name: body.name,
      email: body.email || null,
      department: body.department || null,
      position: body.position || null,
      join_date: body.joinDate ? new Date(body.joinDate) : null,
      isactive: true,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    }

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .insert(transformedBody)
      .select()
      .single()

    if (error) {
      console.error('Employees POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create employee', details: error.message },
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
    console.error('Employees POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}
