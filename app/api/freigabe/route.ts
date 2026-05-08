import { NextRequest, NextResponse } from 'next/server'
import { createFreigabe } from '@/lib/db'

export async function POST(request: NextRequest) {
  let body: { orderId: string; beschreibung: string; foto_url?: string; betrag?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, beschreibung, foto_url, betrag } = body
  if (!orderId || !beschreibung) {
    return NextResponse.json({ error: 'orderId und beschreibung erforderlich' }, { status: 400 })
  }

  const betragNum = betrag ? parseFloat(betrag) : null
  const { token, error } = await createFreigabe(orderId, beschreibung, foto_url ?? null, betragNum)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ token })
}
