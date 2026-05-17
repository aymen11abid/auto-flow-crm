import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createFreigabeBatch } from '@/lib/db'
import { sendSms } from '@/lib/sms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  let body: { orderId: string; positionen: { beschreibung: string; betrag: string | null; foto_url?: string | null }[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, positionen } = body
  if (!orderId || !positionen?.length) {
    return NextResponse.json({ error: 'orderId und positionen erforderlich' }, { status: 400 })
  }

  const db = getSupabase()
  const { data: order } = await db
    .from('auftraege')
    .select('freigabe_token, kunden_telefonnummer, portal_token, werkstatt_id')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })

  let werkstattName = 'Ihre Werkstatt'
  if (order.werkstatt_id) {
    const { data: ws } = await db
      .from('werkstaetten')
      .select('name')
      .eq('id', order.werkstatt_id)
      .single()
    if (ws?.name) werkstattName = ws.name
  }

  const parsed = positionen.map((p) => ({
    beschreibung: p.beschreibung,
    betrag: p.betrag ? parseFloat(p.betrag) : null,
    foto_url: p.foto_url ?? null,
  }))

  const { token, error } = await createFreigabeBatch(orderId, parsed, order.freigabe_token ?? null)
  if (error) return NextResponse.json({ error }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://voxaro.vercel.app'
  const link = order.portal_token
    ? `${appUrl}/auftrag/${order.portal_token}`
    : `${appUrl}/freigabe/${token}`
  await sendSms(
    order.kunden_telefonnummer,
    `${werkstattName}: ${positionen.length} Zusatzarbeit${positionen.length > 1 ? 'en' : ''} zur Freigabe: ${link}`
  )

  return NextResponse.json({ token })
}
