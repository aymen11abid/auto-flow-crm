import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMeisterAlert } from '@/lib/sms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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


const STATUS_MESSAGES: Record<string, string> = {
  neu:                 'Ihr Fahrzeug wurde aufgenommen, wir bearbeiten es in Kürze.',
  in_bearbeitung:      'Ihr Fahrzeug wird gerade von uns bearbeitet.',
  warten_auf_freigabe: 'Wir haben bei Ihrem Fahrzeug etwas festgestellt. Ich sende Ihnen gleich erneut den Freigabe-Link per SMS.',
  abgeschlossen:       'Ihr Fahrzeug ist fertig und kann abgeholt werden.',
  eskalation_rueckruf: 'Wir melden uns gleich bei Ihnen.',
}

export async function POST(request: NextRequest) {
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

  // Laut docs.vapi.ai/tools/custom-tools: message.toolCallList[0].id + .arguments
  const toolCallList  = (body?.message as Record<string, unknown>)?.toolCallList as Record<string, unknown>[] | undefined
  const toolCall      = toolCallList?.[0] ?? {}
  const toolCallId    = String(toolCall.id ?? '')
  const rawArgs       = (toolCall.function as Record<string, unknown>)?.arguments ?? {}
  const vapiArgs      = (typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs) as Record<string, unknown>

  console.log('[voxaro] toolCall:', JSON.stringify(toolCall))

  const telefonnummer      = String(vapiArgs.telefonnummer     ?? body.telefonnummer     ?? '').trim()
  const angerufene_nummer  = String(vapiArgs.angerufene_nummer ?? body.angerufene_nummer ?? '').trim()
  const rueckruf_gewuenscht = vapiArgs.rueckruf_gewuenscht === true || vapiArgs.rueckruf_gewuenscht === 'true'

  // Laut docs.vapi.ai/tools/custom-tools: { results: [{ toolCallId, result }] }
  function vapiResult(result: string) {
    return NextResponse.json(
      toolCallId ? { results: [{ toolCallId, result }] } : { result }
    )
  }

  console.log('[voxaro] order-lookup:', telefonnummer, 'angerufene Nummer:', angerufene_nummer)

  if (!telefonnummer || !angerufene_nummer) {
    return vapiResult('Ich konnte den Auftragsstatus leider nicht prüfen.')
  }

  const db = getSupabase()

  const { data: werkstatt } = await db
    .from('werkstaetten')
    .select('id')
    .in('twilio_nummer', phoneVariants(angerufene_nummer))
    .single()

  if (!werkstatt) {
    console.warn('[voxaro] order-lookup: keine Werkstatt für Nummer:', angerufene_nummer)
    return vapiResult('Leider kann ich den Status gerade nicht abrufen. Ein Kollege wird Sie in Kürze zurückrufen.')
  }

  const werkstatt_id = werkstatt.id

  const { data: orders } = await db
    .from('auftraege')
    .select('id, status, fahrzeug, kunden_name, freigabe_token, kunden_telefonnummer')
    .in('kunden_telefonnummer', phoneVariants(telefonnummer))
    .eq('werkstatt_id', werkstatt_id)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(1)

  let order = orders?.[0] ?? null

  if (!order) {
    const kennzeichen = String(vapiArgs.kennzeichen ?? '').trim()

    if (!kennzeichen) {
      console.log('[voxaro] order-lookup: kein Auftrag per Telefon, frage Kennzeichen nach')
      return vapiResult('FRAGE_KENNZEICHEN')
    }

    console.log('[voxaro] order-lookup: suche per Kennzeichen →', kennzeichen)
    const { data: kfzOrders } = await db
      .from('auftraege')
      .select('id, status, fahrzeug, kunden_name, freigabe_token, kunden_telefonnummer')
      .eq('werkstatt_id', werkstatt_id)
      .ilike('fahrzeug', `%${kennzeichen}%`)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false })
      .limit(1)

    order = kfzOrders?.[0] ?? null

    if (!order) {
      console.log('[voxaro] order-lookup: kein Auftrag per Kennzeichen gefunden →', kennzeichen)
      await db.from('status_anfragen').insert([{ werkstatt_id, telefonnummer }])
      return vapiResult('Leider kann ich den Status gerade nicht abrufen. Ein Kollege wird Sie in Kürze zurückrufen.')
    }
  }

  if (rueckruf_gewuenscht) {
    await db.from('auftraege')
      .update({ status: 'eskalation_rueckruf', status_abgefragt_am: new Date().toISOString() })
      .eq('id', order.id)
    console.log('[voxaro] Rückruf gewünscht → eskalation_rueckruf gesetzt für:', order.id)
    await sendMeisterAlert(
      `Voxaro: Rückruf gewünscht – ${order.kunden_name || 'Unbekannt'}, ${order.fahrzeug || '–'}, Tel: ${order.kunden_telefonnummer || '–'}`
    )
    return vapiResult('Ich habe einen Rückruf für Sie vermerkt. Ein Kollege aus der Werkstatt wird Sie so schnell wie möglich zurückrufen.')
  }

  await db.from('auftraege').update({ status_abgefragt_am: new Date().toISOString() }).eq('id', order.id)
  console.log('[voxaro] order-lookup: Auftrag gefunden, Status:', order.status)

  return vapiResult(STATUS_MESSAGES[order.status] ?? 'Wir schauen nach dem Status Ihres Fahrzeugs.')
}
