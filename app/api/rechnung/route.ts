import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { AngebotPosition } from '@/lib/types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { werkstatt_id, auftrag_id, angebot_id, kunden_name, kunden_telefon, fahrzeug, positionen, mwst_prozent, rechnungsnummer } = body

  if (!werkstatt_id || !kunden_name || !fahrzeug || !positionen?.length) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen.' }, { status: 400 })
  }

  const db     = getSupabase()
  const mwst   = mwst_prozent ?? 19
  const netto  = Math.round((positionen as AngebotPosition[]).reduce((s, p) => s + (p.betrag || 0), 0) * 100) / 100
  const mwstB  = Math.round(netto * (mwst / 100) * 100) / 100
  const gesamt = Math.round((netto + mwstB) * 100) / 100

  // Rechnungsnummer generieren wenn nicht angegeben
  const rnr = rechnungsnummer || `RE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`

  const { data: rechnung, error } = await db
    .from('rechnungen')
    .insert([{ werkstatt_id, auftrag_id: auftrag_id || null, angebot_id: angebot_id || null, rechnungsnummer: rnr, kunden_name, kunden_telefon, fahrzeug, positionen, netto, mwst_betrag: mwstB, gesamt, mwst_prozent: mwst }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rechnung })
}
