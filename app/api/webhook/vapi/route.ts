import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function extractStructuredOutputs(artifact: unknown): Record<string, unknown> {
  if (!artifact || typeof artifact !== 'object') return {}
  const so = (artifact as Record<string, unknown>).structuredOutputs
  if (!so || typeof so !== 'object') return {}

  const result: Record<string, unknown> = {}
  for (const entry of Object.values(so as object)) {
    const e = entry as { name?: string; result?: unknown }
    if (e?.name) result[e.name] = e.result ?? null
  }
  return result
}

function str(val: unknown): string {
  if (val == null || val === '') return ''
  return String(val).trim()
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

async function isWiederholung(db: ReturnType<typeof getSupabase>, telefonnummer: string, werkstatt_id: string | null): Promise<boolean> {
  if (!telefonnummer) return false
  let query = db
    .from('auftraege')
    .select('id', { count: 'exact', head: true })
    .eq('kunden_telefonnummer', telefonnummer)
    .is('geloescht_am', null)
  if (werkstatt_id) query = query.eq('werkstatt_id', werkstatt_id)
  const { count } = await query
  return (count ?? 0) > 0
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const message   = (body.message ?? body) as Record<string, unknown>
  const eventType = str(message.type)

  console.log('[vapi] ─── incoming event:', eventType)

  if (eventType !== 'end-of-call-report') {
    console.log('[vapi] ignored:', eventType)
    return NextResponse.json({ success: true, ignored: true })
  }

  const db = getSupabase()

  // ── Angerufene Nummer → Werkstatt identifizieren ──────────────────────────
  const call            = (message.call as Record<string, unknown>) ?? {}
  const msgPhoneObj     = (message.phoneNumber as Record<string, unknown>) ?? {}
  const callPhoneObj    = (call.phoneNumber    as Record<string, unknown>) ?? {}
  const angerufene_nummer = str(msgPhoneObj.number) || str(callPhoneObj.number)

  let werkstatt_id: string | null = null
  if (angerufene_nummer) {
    const { data: werkstatt } = await db
      .from('werkstaetten')
      .select('id')
      .in('twilio_nummer', phoneVariants(angerufene_nummer))
      .single()
    werkstatt_id = werkstatt?.id ?? null
    if (!werkstatt_id) {
      console.warn('[vapi] keine Werkstatt für Nummer:', angerufene_nummer)
    } else {
      console.log('[vapi] Werkstatt gefunden:', werkstatt_id)
    }
  } else {
    console.warn('[vapi] keine angerufene Nummer im Payload')
  }

  // ── Strukturierte Outputs ─────────────────────────────────────────────────
  const artifact = message.artifact
  const outputs  = extractStructuredOutputs(artifact)

  console.log('[vapi] outputs map:', JSON.stringify(outputs))

  // ── Kunden-Telefonnummer ──────────────────────────────────────────────────
  const msgCustomer  = (message.customer as Record<string, unknown>) ?? {}
  const callCustomer = (call.customer    as Record<string, unknown>) ?? {}

  const kunden_telefonnummer =
    str(msgCustomer.number) || str(callCustomer.number)

  // ── Felder aus structuredOutputs ──────────────────────────────────────────
  const kunden_name          = str(outputs.kunden_name)
  const fahrzeug             = str(outputs.fahrzeug)
  const problem_beschreibung = str(outputs.problem_beschreibung)
  const termin_vereinbart    = outputs.termin_vereinbart === true

  const rueckruf_raw    = str(outputs.rueckruf_wunsch).toLowerCase()
  const rueckruf_wunsch = ['vormittags', 'nachmittags', 'egal'].includes(rueckruf_raw)
    ? (rueckruf_raw as 'vormittags' | 'nachmittags' | 'egal')
    : null

  const wunschtermin_tag  = str(outputs.wunschtermin_tag) || null
  const wunschtermin_raw  = str(outputs.wunschtermin_zeit).toLowerCase()
  const wunschtermin_zeit = ['vormittags', 'nachmittags', 'egal'].includes(wunschtermin_raw)
    ? (wunschtermin_raw as 'vormittags' | 'nachmittags' | 'egal')
    : null

  // ── Sicherheits-Fix: kein Telefonnummer → immer Eskalation ────────────────
  if (!kunden_telefonnummer) {
    console.warn('[vapi] kein Telefonnummer – wird als Eskalation markiert')
  }
  const status = !kunden_telefonnummer
    ? 'eskalation_rueckruf'
    : termin_vereinbart
      ? 'neu'
      : 'eskalation_rueckruf'

  // ── Rückrufer-Erkennung ───────────────────────────────────────────────────
  const ist_wiederholung = await isWiederholung(db, kunden_telefonnummer, werkstatt_id)
  if (ist_wiederholung) {
    console.log('[vapi] Rückrufer erkannt:', kunden_telefonnummer)
  }

  console.log('[vapi] fields to save:', {
    werkstatt_id,
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    termin_vereinbart,
    status,
    ist_wiederholung,
  })

  const { error } = await db.from('auftraege').insert([{
    werkstatt_id,
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    rueckruf_wunsch,
    wunschtermin_tag,
    wunschtermin_zeit,
    status,
    ist_wiederholung,
  }])

  if (error) {
    console.error('[vapi] Supabase error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  console.log('[vapi] ✓ Auftrag gespeichert, werkstatt_id:', werkstatt_id, 'Wiederholung:', ist_wiederholung)
  return NextResponse.json({ success: true, ist_wiederholung })
}
