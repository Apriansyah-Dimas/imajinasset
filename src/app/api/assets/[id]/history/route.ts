import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type HistoryType = 'CHECK_OUT' | 'CHECK_IN' | 'SO_UPDATE'

type HistoryItem = {
  id: string
  type: HistoryType
  timestamp: string
  summary: string
  details?: any
  source: 'checkout' | 'event'
}

const parsePayload = (payload?: string | null) => {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

const mapCheckoutToHistory = (checkout: any): HistoryItem[] => {
  const items: HistoryItem[] = []

  items.push({
    id: `${checkout.id}-out`,
    type: 'CHECK_OUT',
    timestamp: checkout.checkoutDate?.toISOString?.() ?? new Date(checkout.checkoutDate).toISOString(),
    summary: `Check-out ke ${checkout.assignTo?.name ?? 'PIC tidak dikenal'}`,
    details: {
      assignTo: checkout.assignTo,
      department: checkout.department,
      dueDate: checkout.dueDate,
      notes: checkout.notes,
      signatureData: checkout.signatureData,
      status: checkout.status,
    },
    source: 'checkout',
  })

  if (checkout.returnedAt) {
    items.push({
      id: `${checkout.id}-in`,
      type: 'CHECK_IN',
      timestamp: checkout.returnedAt?.toISOString?.() ?? new Date(checkout.returnedAt).toISOString(),
      summary: `Check-in oleh ${checkout.receivedBy?.name ?? 'PIC tidak dikenal'}`,
      details: {
        receivedBy: checkout.receivedBy,
        notes: checkout.returnNotes,
        signatureData: checkout.returnSignatureData,
        status: checkout.status,
      },
      source: 'checkout',
    })
  }

  return items
}

const buildSummaryFromEvent = (event: any, parsedPayload: any): string => {
  if (event.type === 'CHECK_OUT') {
    return `Check-out ke ${parsedPayload?.assignTo?.name ?? 'PIC tidak dikenal'}`
  }
  if (event.type === 'CHECK_IN') {
    return `Check-in oleh ${parsedPayload?.receivedBy ?? parsedPayload?.assignTo?.name ?? 'PIC tidak dikenal'}`
  }
  if (event.type === 'SO_UPDATE') {
    const changeCount = parsedPayload?.changes?.length ?? 0
    return `SO Update ${changeCount > 0 ? `(${changeCount} perubahan)` : ''}`.trim()
  }
  return event.type
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type') as HistoryType | null
    const parsedLimit = parseInt(searchParams.get('limit') ?? '0', 10)
    const limit = parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50

    const [events, checkouts] = await Promise.all([
      db.assetEvent.findMany({
        where: {
          assetId,
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2,
      }),
      db.assetCheckout.findMany({
        where: { assetId },
        orderBy: { checkoutDate: 'desc' },
        take: limit * 2,
        include: {
          assignTo: { select: { id: true, name: true, employeeId: true } },
          department: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true, employeeId: true } },
        },
      }),
    ])

    const seenSourceKeys = new Set<string>()

    const eventItems: HistoryItem[] = events
      .filter((event) => !typeFilter || event.type === typeFilter)
      .map((event) => {
        const parsed = parsePayload(event.payload)
        if (event.checkoutId) {
          seenSourceKeys.add(`${event.type}-${event.checkoutId}`)
        }
        return {
          id: event.id,
          type: event.type as HistoryType,
          timestamp: event.createdAt.toISOString(),
          summary: buildSummaryFromEvent(event, parsed),
          details: parsed,
          source: 'event',
        }
      })

    const checkoutItems = checkouts
      .flatMap(mapCheckoutToHistory)
      .filter((item) => {
        if (typeFilter && item.type !== typeFilter) return false
        if (item.source === 'checkout') {
          const key = `${item.type}-${item.id.split('-')[0]}`
          return !seenSourceKeys.has(key)
        }
        return true
      })

    const history = [...eventItems, ...checkoutItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({ history: history.slice(0, limit) })
  } catch (error) {
    console.error('Failed to fetch asset history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset history' },
      { status: 500 }
    )
  }
}
