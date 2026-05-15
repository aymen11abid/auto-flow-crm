import { NextRequest, NextResponse } from 'next/server'
import { fetchOrderByPortalToken, fetchFreigabenByAuftrag } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { order, error } = await fetchOrderByPortalToken(token)
  if (error || !order) {
    return NextResponse.json({ error: error ?? 'Nicht gefunden' }, { status: 404 })
  }
  const freigaben = await fetchFreigabenByAuftrag(order.id)
  return NextResponse.json({ order, freigaben })
}
