import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('so_sessions')
      .select('*')
      .order('createdat', { ascending: false })

    if (error) {
      console.error('Database error fetching SO sessions:', error)
      // Return empty array if table doesn't exist yet
      if (error.code === 'PGRST116') { // relation does not exist
        return NextResponse.json([])
      }
      throw error
    }

    // Convert field names to camelCase for frontend compatibility
    const camelCaseSessions = (sessions || []).map(session => ({
      id: session.id,
      name: session.name,
      year: session.year,
      description: session.description,
      status: session.status,
      totalAssets: session.total_assets,
      scannedAssets: session.scanned_assets,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      createdAt: session.createdat,
      updatedAt: session.updatedat
    }))

    return NextResponse.json(camelCaseSessions)
  } catch (error) {
    console.error('Error fetching SO sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SO sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, year, description } = body

    if (!name || !year) {
      return NextResponse.json(
        { error: 'Name and year are required' },
        { status: 400 }
      )
    }

    // Get total assets count
    const { count: totalAssets } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })

    const sessionData = {
      id: randomUUID(),
      name,
      year,
      description,
      status: 'Active',
      total_assets: totalAssets || 0,
      scanned_assets: 0,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    }

    const { data: session, error } = await supabaseAdmin
      .from('so_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) {
      console.error('Database error creating SO session:', error)
      throw error
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error creating SO session:', error)
    return NextResponse.json(
      { error: 'Failed to create SO session' },
      { status: 500 }
    )
  }
}