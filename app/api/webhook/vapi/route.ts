import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

async function isWiederholung(telefonnummer: string): Promise<boolean> {
  if (!telefonnummer) return false
  const { count } = await supabase
    .from('auftraege')
    .select('id', { count: 'exact', head: true })
    .eq('kunden_telefonnummer', telefonnummer)
    .is('geloescht_am', null)
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

  // ── Strukturierte Outputs ─────────────────────────────────────────────────
  const artifact = message.artifact
  const outputs  = extractStructuredOutputs(artifact)

  console.log('[vapi] outputs map:', JSON.stringify(outputs))

  // ── Telefonnummer ─────────────────────────────────────────────────────────
  const msgCustomer  = (message.customer as Record<string, unknown>) ?? {}
  const call         = (message.call     as Record<string, unknown>) ?? {}
  const callCustomer = (call.customer    as Record<string, unknown>) ?? {}

  const kunden_telefonnummer =
    str(msgCustomer.number) || str(callCustomer.number)

  // ── Felder aus structuredOutputs ──────────────────────────────────────────
  const kunden_name          = str(outputs.kunden_name)
  const fahrzeug             = str(outputs.fahrzeug)
  const problem_beschreibung = str(outputs.problem_beschreibung)
  const termin_vereinbart    = outputs.termin_vereinbart === true

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
  const ist_wiederholung = await isWiederholung(kunden_telefonnummer)
  if (ist_wiederholung) {
    console.log('[vapi] Rückrufer erkannt:', kunden_telefonnummer)
  }

  console.log('[vapi] fields to save:', {
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    termin_vereinbart,
    status,
    ist_wiederholung,
  })

  const { error } = await supabase.from('auftraege').insert([{
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    status,
    ist_wiederholung,
  }])

  if (error) {
    console.error('[vapi] Supabase error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  console.log('[vapi] ✓ Auftrag gespeichert, Wiederholung:', ist_wiederholung)
  return NextResponse.json({ success: true, ist_wiederholung })
}
