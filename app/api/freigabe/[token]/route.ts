import { NextRequest, NextResponse } from 'next/server'
import { fetchOrderByFreigabeToken, resolveFreigabe } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { order, error } = await fetchOrderByFreigabeToken(token)
  if (error || !order) {
    return NextResponse.json({ error: error ?? 'Nicht gefunden' }, { status: 404 })
  }
  return NextResponse.json({ order })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  let body: { result: 'approved' | 'rejected' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.result !== 'approved' && body.result !== 'rejected') {
    return NextResponse.json({ error: 'result muss approved oder rejected sein' }, { status: 400 })
  }

  const error = await resolveFreigabe(token, body.result)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
