import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSms } from '@/lib/sms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(nr: string): string {
  const clean = nr.replace(/\s/g, '')
  if (clean.startsWith('00')) return '+' + clean.slice(2)
  if (clean.startsWith('0')) return '+49' + clean.slice(1)
  return clean
}

function formatTermin(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }) + ' Uhr'
}

export async function POST(request: NextRequest) {
  let body: { orderId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.orderId) {
    return NextResponse.json({ error: 'orderId erforderlich' }, { status: 400 })
  }

  const db = getSupabase()

  const { data: order } = await db
    .from('auftraege')
    .select('kunden_telefonnummer, fahrzeug, termin_datum, werkstatt_id')
    .eq('id', body.orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })
  if (!order.termin_datum) return NextResponse.json({ error: 'Kein Termin gesetzt' }, { status: 400 })

  let werkstattName = 'Ihre Werkstatt'
  if (order.werkstatt_id) {
    const { data: ws } = await db
      .from('werkstaetten')
      .select('name')
      .eq('id', order.werkstatt_id)
      .single()
    if (ws?.name) werkstattName = ws.name
  }

  const text =
    `${werkstattName}: Ihr Termin für ${order.fahrzeug || 'Ihr Fahrzeug'} ist bestätigt.\n` +
    `${formatTermin(order.termin_datum)}\n` +
    `Bei Fragen rufen Sie uns an.`

  try {
    await sendSms(normalizePhone(order.kunden_telefonnummer), text)
    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'SMS-Fehler'
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
