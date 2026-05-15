import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
  let body: { orderId: string; trigger: 'in_bearbeitung' | 'abgeschlossen' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, trigger } = body
  if (!orderId || !trigger) {
    return NextResponse.json({ error: 'orderId und trigger erforderlich' }, { status: 400 })
  }

  const db = getSupabase()
  const { data: order } = await db
    .from('auftraege')
    .select('kunden_telefonnummer, portal_token, portal_sms_gesendet_am, portal_fertig_sms_gesendet_am')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://voxaro.vercel.app'

  if (trigger === 'in_bearbeitung') {
    if (order.portal_sms_gesendet_am) {
      return NextResponse.json({ token: order.portal_token, alreadySent: true })
    }

    const token = order.portal_token ?? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    await db
      .from('auftraege')
      .update({ portal_token: token, portal_sms_gesendet_am: new Date().toISOString() })
      .eq('id', orderId)

    const link = `${appUrl}/auftrag/${token}`
    await sendSms(
      order.kunden_telefonnummer,
      `Ihre Werkstatt hat mit der Arbeit an Ihrem Fahrzeug begonnen. Hier können Sie den Status verfolgen: ${link}`
    )

    return NextResponse.json({ token })
  }

  if (trigger === 'abgeschlossen') {
    if (order.portal_fertig_sms_gesendet_am || !order.portal_token) {
      return NextResponse.json({ token: order.portal_token, alreadySent: true })
    }

    await db
      .from('auftraege')
      .update({ portal_fertig_sms_gesendet_am: new Date().toISOString() })
      .eq('id', orderId)

    const link = `${appUrl}/auftrag/${order.portal_token}`
    await sendSms(
      order.kunden_telefonnummer,
      `Ihr Fahrzeug ist fertig und kann abgeholt werden. Zur Übersicht: ${link}`
    )

    return NextResponse.json({ token: order.portal_token })
  }

  return NextResponse.json({ error: 'Ungültiger trigger' }, { status: 400 })
}
