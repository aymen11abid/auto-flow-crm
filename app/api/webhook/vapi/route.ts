import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Vapi-Event-Typen die einen Auftrag erzeugen sollen
const RELEVANT_TYPES = new Set(['end-of-call-report', 'call.ended'])

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // Vapi wraps alles unter body.message
  const message = (body.message ?? body) as Record<string, unknown>
  const eventType = message.type as string | undefined

  // Debug-Log: zeigt das komplette Payload im Server-Terminal
  console.log('[vapi-webhook] event type:', eventType)
  console.log('[vapi-webhook] payload:', JSON.stringify(body, null, 2))

  // Alle Events ausser end-of-call-report / call.ended ignorieren
  if (!eventType || !RELEVANT_TYPES.has(eventType)) {
    return NextResponse.json({ success: true, ignored: true })
  }

  // ── Telefonnummer ──────────────────────────────────────────────────────────
  // Vapi legt customer direkt unter message UND unter message.call.customer
  const messageCustomer  = (message.customer  as Record<string, unknown>) ?? {}
  const callCustomer     = ((message.call as Record<string, unknown>)?.customer as Record<string, unknown>) ?? {}

  const telefonnummer =
    (messageCustomer.number  as string) ||
    (callCustomer.number     as string) ||
    ''

  // ── Strukturierte Daten (Vapi Analysis) ───────────────────────────────────
  const analysis    = (message.analysis  as Record<string, unknown>) ?? {}
  const structured  = (analysis.structuredData as Record<string, unknown>) ?? {}

  const kunden_name = String(
    structured.kunden_name ?? structured.name ?? ''
  ).trim()

  const kunden_telefonnummer = String(
    structured.kunden_telefonnummer ??
    structured.telefonnummer ??
    telefonnummer
  ).trim()

  const fahrzeug = String(
    structured.fahrzeug ?? structured.vehicle ?? ''
  ).trim()

  const problem_beschreibung = String(
    structured.problem_beschreibung ??
    structured.problem ??
    structured.issue ??
    ''
  ).trim()

  // ── Status ────────────────────────────────────────────────────────────────
  const termin_vereinbart =
    structured.termin_vereinbart === true ||
    structured.termin_vereinbart === 'true' ||
    structured.appointment_scheduled === true

  const status = termin_vereinbart ? 'neu' : 'eskalation_rueckruf'

  // ── Speichern ─────────────────────────────────────────────────────────────
  const { error } = await supabase.from('auftraege').insert([{
    kunden_name,
    kunden_telefonnummer,
    fahrzeug,
    problem_beschreibung,
    status,
  }])

  if (error) {
    console.error('[vapi-webhook] Supabase insert error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  console.log('[vapi-webhook] Auftrag gespeichert:', { kunden_name, kunden_telefonnummer, fahrzeug, status })
  return NextResponse.json({ success: true })
}
