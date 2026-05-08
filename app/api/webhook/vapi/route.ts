import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Vapi sendet end-of-call-report wenn der Anruf beendet ist
// Struktur: body.message.type = "end-of-call-report"
//           body.message.artifact.structuredOutputs = { [uuid]: { name, result } }
//           body.message.customer.number = Telefonnummer

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

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // Vapi wraps alles unter body.message
  const message   = (body.message ?? body) as Record<string, unknown>
  const eventType = str(message.type)

  console.log('[vapi] ─── incoming event:', eventType)

  // Alle Events außer end-of-call-report ignorieren
  if (eventType !== 'end-of-call-report') {
    console.log('[vapi] ignored:', eventType)
    return NextResponse.json({ success: true, ignored: true })
  }

  // ── Strukturierte Outputs ─────────────────────────────────────────────────
  // Pfad: message.artifact.structuredOutputs
  const artifact = message.artifact
  const outputs  = extractStructuredOutputs(artifact)

  console.log('[vapi] artifact.structuredOutputs raw:', JSON.stringify(artifact && typeof artifact === 'object' ? (artifact as Record<string,unknown>).structuredOutputs : null))
  console.log('[vapi] outputs map:', JSON.stringify(outputs))

  // ── Telefonnummer ─────────────────────────────────────────────────────────
  // Pfad 1: message.customer.number
  // Pfad 2: message.call.customer.number
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

  const status = termin_vereinbart ? 'neu' : 'eskalation_rueckruf'

  console.log('[vapi] fields to save:', {
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    termin_vereinbart,
    status,
  })

  // ── Validierung ───────────────────────────────────────────────────────────
  if (!kunden_telefonnummer) {
    console.warn('[vapi] kein Telefonnummer – Auftrag wird trotzdem gespeichert')
  }

  const { error } = await supabase.from('auftraege').insert([{
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    status,
  }])

  if (error) {
    console.error('[vapi] Supabase error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  console.log('[vapi] ✓ Auftrag gespeichert')
  return NextResponse.json({ success: true })
}
