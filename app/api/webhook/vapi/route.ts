import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RELEVANT_TYPES = new Set(['end-of-call-report', 'call.ended'])

function str(val: unknown): string {
  return val != null && val !== '' ? String(val).trim() : ''
}

// Vapi speichert strukturierte Outputs als { [uuid]: { name, result } }
// Diese Funktion wandelt das in eine einfache { name: result } Map um
function parseStructuredOutputs(artifact: Record<string, unknown>): Record<string, unknown> {
  const outputs = artifact.structuredOutputs as Record<string, { name: string; result: unknown }> | undefined
  if (!outputs) return {}
  const map: Record<string, unknown> = {}
  for (const entry of Object.values(outputs)) {
    if (entry?.name != null) map[entry.name] = entry.result
  }
  return map
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

  console.log('[vapi] event type:', eventType)

  if (!eventType || !RELEVANT_TYPES.has(eventType)) {
    console.log('[vapi] ignored:', eventType)
    return NextResponse.json({ success: true, ignored: true })
  }

  // ── Strukturierte Outputs aus message.artifact.structuredOutputs ──────────
  const artifact  = (message.artifact as Record<string, unknown>) ?? {}
  const outputs   = parseStructuredOutputs(artifact)

  // ── Telefonnummer aus message.customer.number ─────────────────────────────
  const msgCustomer  = (message.customer as Record<string, unknown>) ?? {}
  const call         = (message.call     as Record<string, unknown>) ?? {}
  const callCustomer = (call.customer    as Record<string, unknown>) ?? {}

  const kunden_name          = str(outputs.kunden_name)          || str(callCustomer.name)
  const fahrzeug             = str(outputs.fahrzeug)
  const problem_beschreibung = str(outputs.problem_beschreibung)
  const kunden_telefonnummer = str(msgCustomer.number)           || str(callCustomer.number)

  const termin_vereinbart =
    outputs.termin_vereinbart === true ||
    outputs.termin_vereinbart === 'true'

  const status = termin_vereinbart ? 'neu' : 'eskalation_rueckruf'

  console.log('[vapi] extracted:', { kunden_name, kunden_telefonnummer, fahrzeug, problem_beschreibung, termin_vereinbart, status })

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

  console.log('[vapi] Auftrag gespeichert ✓')
  return NextResponse.json({ success: true })
}
