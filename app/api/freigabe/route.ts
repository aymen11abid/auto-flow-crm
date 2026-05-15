import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createFreigabeBatch } from '@/lib/db'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(nr: string): string {
  const clean = nr.replace(/\s/g, '')
  if (clean.startsWith('00')) return '+' + clean.slice(2)
  if (clean.startsWith('0'))  return '+49' + clean.slice(1)
  return clean
}

async function sendSms(to: string, body: string) {
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_FROM_NUMBER!,
        To:   to,
        Body: body,
      }).toString(),
    }
  )
}

export async function POST(request: NextRequest) {
  let body: { orderId: string; positionen: { beschreibung: string; betrag: string | null }[] }
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
    .select('freigabe_token, kunden_telefonnummer, portal_token')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })

  const parsed = positionen.map((p) => ({
    beschreibung: p.beschreibung,
    betrag: p.betrag ? parseFloat(p.betrag) : null,
  }))

  const { token, error } = await createFreigabeBatch(orderId, parsed, order.freigabe_token ?? null)
  if (error) return NextResponse.json({ error }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://voxaro.vercel.app'
  const link = order.portal_token
    ? `${appUrl}/auftrag/${order.portal_token}`
    : `${appUrl}/freigabe/${token}`
  await sendSms(
    normalizePhone(order.kunden_telefonnummer),
    `Ihre Werkstatt hat ${positionen.length} Zusatzarbeit${positionen.length > 1 ? 'en' : ''} zur Freigabe: ${link}`
  )

  return NextResponse.json({ token })
}
