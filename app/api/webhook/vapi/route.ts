import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-seitiger Client – läuft nur in der API Route, nie im Browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // Vapi sendet entweder das Payload direkt oder unter body.message
  const payload = (body as Record<string, unknown>)
  const message = (payload.message ?? payload) as Record<string, unknown>

  // Strukturierte Daten aus Vapi-Analyse (konfiguriert im Vapi-Dashboard)
  const structured = (
    (message.analysis as Record<string, unknown>)?.structuredData ?? {}
  ) as Record<string, unknown>

  // Telefonnummer: primär aus structuredData, Fallback aus call.customer.number
  const callCustomer = (
    (message.call as Record<string, unknown>)?.customer ?? {}
  ) as Record<string, unknown>

  const kunden_name = String(
    structured.kunden_name ?? structured.name ?? ''
  ).trim()

  const kunden_telefonnummer = String(
    structured.kunden_telefonnummer ??
    structured.telefonnummer ??
    callCustomer.number ??
    ''
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

  // Termin vereinbart? → Status ableiten
  const termin_vereinbart =
    structured.termin_vereinbart === true ||
    structured.termin_vereinbart === 'true' ||
    structured.appointment_scheduled === true

  const status = termin_vereinbart ? 'neu' : 'eskalation_rueckruf'

  const { error } = await supabase.from('auftraege').insert([
    {
      kunden_name,
      kunden_telefonnummer,
      fahrzeug,
      problem_beschreibung,
      status,
    },
  ])

  if (error) {
    console.error('[vapi-webhook] Supabase insert error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
