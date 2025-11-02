import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get('authorization')

    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const token = authorization.replace('Bearer ', '')
    const decoded = JSON.parse(atob(token.split('.')[1]))

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Mock system health data - in a real app, you would gather actual system metrics
    const systemHealth = {
      server: {
        status: 'healthy' as const,
        uptime: Math.floor(Math.random() * 30 * 24 * 60 * 60) + 7 * 24 * 60 * 60, // 7-37 days in seconds
        memory: {
          used: Math.floor(Math.random() * 2 * 1024 * 1024 * 1024) + 512 * 1024 * 1024, // 0.5-2.5 GB in bytes
          total: 4 * 1024 * 1024 * 1024, // 4 GB total
        },
        cpu: {
          usage: Math.floor(Math.random() * 60) + 10 // 10-70% usage
        },
        disk: {
          used: Math.floor(Math.random() * 50 * 1024 * 1024 * 1024) + 10 * 1024 * 1024 * 1024, // 10-60 GB in bytes
          total: 100 * 1024 * 1024 * 1024, // 100 GB total
        }
      },
      database: {
        status: 'healthy' as const,
        connections: Math.floor(Math.random() * 10) + 1, // 1-10 connections
        responseTime: Math.floor(Math.random() * 50) + 5 // 5-55ms response time
      },
      lastBackup: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(), // Within last 2 days
      activeUsers: Math.floor(Math.random() * 20) + 5, // 5-25 active users
      activeSessions: Math.floor(Math.random() * 10) + 1 // 1-10 active sessions
    }

    // Calculate percentages
    systemHealth.server.memory.percentage = Math.round((systemHealth.server.memory.used / systemHealth.server.memory.total) * 100)
    systemHealth.server.disk.percentage = Math.round((systemHealth.server.disk.used / systemHealth.server.disk.total) * 100)

    // Simulate server status based on resource usage
    if (systemHealth.server.cpu.usage > 80 || systemHealth.server.memory.percentage > 90) {
      systemHealth.server.status = 'critical'
    } else if (systemHealth.server.cpu.usage > 60 || systemHealth.server.memory.percentage > 75) {
      systemHealth.server.status = 'warning'
    }

    // Simulate database status based on response time
    if (systemHealth.database.responseTime > 100) {
      systemHealth.database.status = 'critical'
    } else if (systemHealth.database.responseTime > 50) {
      systemHealth.database.status = 'warning'
    }

    return NextResponse.json(systemHealth)

  } catch (error) {
    console.error('Error fetching system health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system health' },
      { status: 500 }
    )
  }
}