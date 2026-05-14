import { NextRequest, NextResponse } from 'next/server'
import { fetchOrderByFreigabeToken, fetchFreigabenByToken, resolveFreigabePosition } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { order, error } = await fetchOrderByFreigabeToken(token)
  if (error || !order) {
    return NextResponse.json({ error: error ?? 'Nicht gefunden' }, { status: 404 })
  }
  const freigaben = await fetchFreigabenByToken(token)
  return NextResponse.json({ order, freigaben })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  let body: { freigabeId: string; result: 'approved' | 'rejected' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.freigabeId || (body.result !== 'approved' && body.result !== 'rejected')) {
    return NextResponse.json({ error: 'freigabeId und result erforderlich' }, { status: 400 })
  }

  const error = await resolveFreigabePosition(body.freigabeId, token, body.result)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
