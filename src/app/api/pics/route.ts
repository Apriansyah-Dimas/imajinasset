import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // First try with relationship, but fall back to simple query if relationship doesn't exist
    let employees, error

    try {
      const result = await supabaseAdmin
        .from('employees')
        .select(`
          id,
          employee_id,
          name,
          email,
          department:departments (
            id,
            name
          ),
          position
        `)
        .eq('isactive', true)
        .order('name')

      employees = result.data
      error = result.error
    } catch (relError) {
      // If relationship query fails, try simple query
      const result = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('isactive', true)
        .order('name')

      employees = result.data
      error = result.error
    }

    if (error) {
      console.error('Database error fetching employees:', error)
      // Return empty array if table doesn't exist yet
      if (error.code === 'PGRST116') { // relation does not exist
        return NextResponse.json([])
      }
      // If relationship error, try simple query
      if (error.code === 'PGRST200') { // relationship not found
        const { data: simpleEmployees, error: simpleError } = await supabaseAdmin
          .from('employees')
          .select('*')
          .eq('isactive', true)
          .order('name')

        if (simpleError) {
          throw simpleError
        }

        const formatted = (simpleEmployees || []).map(employee => ({
          id: employee.id,
          name: `${employee.name} (${employee.employee_id})`,
          employeeId: employee.employee_id,
          email: employee.email,
          department: null, // No department data available
          position: employee.position,
          type: 'employee',
        }))

        return NextResponse.json(formatted)
      }
      throw error
    }

    const formatted = (employees || []).map(employee => ({
      id: employee.id,
      name: `${employee.name} (${employee.employee_id})`,
      employeeId: employee.employee_id,
      email: employee.email,
      department: employee.department || null,
      position: employee.position,
      type: 'employee',
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Pics GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PIC options' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'PICs are managed via Employee Management' },
    { status: 405 }
  )
}
