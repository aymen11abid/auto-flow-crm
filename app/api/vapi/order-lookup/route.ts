import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function phoneVariants(phone: string): string[] {
  const clean = phone.replace(/[\s\-\(\)]/g, '')
  const variants = new Set<string>()
  variants.add(clean)

  if (clean.startsWith('+49')) {
    variants.add('0' + clean.slice(3))
    variants.add('0049' + clean.slice(3))
  } else if (clean.startsWith('0049')) {
    variants.add('+49' + clean.slice(4))
    variants.add('0' + clean.slice(4))
  } else if (clean.startsWith('0') && clean.length > 5) {
    variants.add('+49' + clean.slice(1))
    variants.add('0049' + clean.slice(1))
  }

  return Array.from(variants)
}

async function sendFreigabeSms(telefonnummer: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link   = `${appUrl}/freigabe/${token}`

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: process.env.TWILIO_FROM_NUMBER!,
      To:   telefonnummer,
      Body: `Ihr Freigabe-Link: ${link}`,
    }).toString(),
  })
}

const STATUS_MESSAGES: Record<string, string> = {
  neu:                 'Ihr Fahrzeug wurde aufgenommen, wir bearbeiten es in Kürze.',
  in_bearbeitung:      'Ihr Fahrzeug wird gerade von uns bearbeitet.',
  warten_auf_freigabe: 'Wir haben bei Ihrem Fahrzeug etwas festgestellt. Ich sende Ihnen gleich erneut den Freigabe-Link per SMS.',
  abgeschlossen:       'Ihr Fahrzeug ist fertig und kann abgeholt werden.',
  eskalation_rueckruf: 'Wir melden uns gleich bei Ihnen.',
}

export async function POST(request: NextRequest) {
  // Einfache Secret-Authentifizierung für Vapi
  const secret = request.headers.get('x-vapi-secret')
  if (secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const telefonnummer = String(body.telefonnummer ?? '').trim()
  const werkstatt_id  = String(body.werkstatt_id  ?? '').trim()

  if (!telefonnummer || !werkstatt_id) {
    return NextResponse.json({ error: 'telefonnummer und werkstatt_id erforderlich' }, { status: 400 })
  }

  console.log('[voxaro] order-lookup:', telefonnummer, 'werkstatt:', werkstatt_id)

  const { data: orders } = await supabase
    .from('auftraege')
    .select('id, status, fahrzeug, kunden_name, freigabe_token, kunden_telefonnummer')
    .in('kunden_telefonnummer', phoneVariants(telefonnummer))
    .eq('werkstatt_id', werkstatt_id)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(1)

  const order = orders?.[0] ?? null

  if (!order) {
    console.log('[voxaro] order-lookup: kein Auftrag gefunden →', telefonnummer)
    await supabase.from('status_anfragen').insert([{ werkstatt_id, telefonnummer }])

    return NextResponse.json({
      found:   false,
      message: 'Ich habe leider keinen Auftrag für Ihre Nummer gefunden. Ich informiere den Meister – er meldet sich bei Ihnen.',
    })
  }

  // Freigabe-SMS erneut senden wenn Auftrag auf Freigabe wartet
  if (order.status === 'warten_auf_freigabe' && order.freigabe_token) {
    await sendFreigabeSms(order.kunden_telefonnummer, order.freigabe_token)
    console.log('[voxaro] Freigabe-SMS erneut gesendet an:', order.kunden_telefonnummer)
  }

  console.log('[voxaro] order-lookup: Auftrag gefunden, Status:', order.status)

  return NextResponse.json({
    found:    true,
    status:   order.status,
    fahrzeug: order.fahrzeug,
    message:  STATUS_MESSAGES[order.status] ?? 'Wir schauen nach dem Status Ihres Fahrzeugs.',
  })
}
