import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RELEVANT_TYPES = new Set(['end-of-call-report', 'call.ended'])

function str(val: unknown): string {
  return val != null ? String(val).trim() : ''
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Kompletter Request Body im Log ────────────────────────────────────────
  console.log('=== VAPI WEBHOOK RECEIVED ===')
  console.log(JSON.stringify(body, null, 2))
  console.log('=== END VAPI WEBHOOK ===')

  const message   = (body.message ?? body) as Record<string, unknown>
  const eventType = str(message.type)

  console.log('[vapi] event type:', eventType)

  if (!eventType || !RELEVANT_TYPES.has(eventType)) {
    console.log('[vapi] ignored event:', eventType)
    return NextResponse.json({ success: true, ignored: true })
  }

  // ── Pfade exakt wie vom User definiert ────────────────────────────────────
  const analysis    = (message.analysis   as Record<string, unknown>) ?? {}
  const structured  = (analysis.structuredData as Record<string, unknown>) ?? {}
  const call        = (message.call       as Record<string, unknown>) ?? {}
  const msgCustomer = (message.customer   as Record<string, unknown>) ?? {}
  const callCustomer= (call.customer      as Record<string, unknown>) ?? {}

  // kunden_name: structuredData.kunden_name → call.customer.name
  const kunden_name = str(structured.kunden_name) || str(callCustomer.name)

  // fahrzeug: structuredData.fahrzeug
  const fahrzeug = str(structured.fahrzeug)

  // problem_beschreibung: structuredData.problem_beschreibung
  const problem_beschreibung = str(structured.problem_beschreibung)

  // kunden_telefonnummer: message.customer.number → message.call.customer.number
  const kunden_telefonnummer = str(msgCustomer.number) || str(callCustomer.number)

  // termin_vereinbart: structuredData.termin_vereinbart
  const termin_vereinbart =
    structured.termin_vereinbart === true ||
    structured.termin_vereinbart === 'true'

  const status = termin_vereinbart ? 'neu' : 'eskalation_rueckruf'

  console.log('[vapi] extracted fields:', {
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    termin_vereinbart,
    status,
  })

  // ── Speichern ─────────────────────────────────────────────────────────────
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
