import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = getSupabase()
  const { data, error } = await db.from('angebote').select('*').eq('token', token).single()
  if (error) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  return NextResponse.json({ angebot: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { ergebnis } = await req.json()

  if (ergebnis !== 'genehmigt' && ergebnis !== 'abgelehnt') {
    return NextResponse.json({ error: 'Ungültiges Ergebnis.' }, { status: 400 })
  }

  const db = getSupabase()
  const { error } = await db
    .from('angebote')
    .update({ status: ergebnis, entschieden_am: new Date().toISOString() })
    .eq('token', token)
    .eq('status', 'gesendet') // nur einmal entscheiden

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bei Genehmigung: Angebot-Status auf gesendet → genehmigt gesetzt
  // Werkstatt sieht das in Angebote-Liste (später)
  return NextResponse.json({ ok: true })
}
