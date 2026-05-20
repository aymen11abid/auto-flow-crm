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
  const { werkstatt_id, anruf_id, kunden_name, kunden_telefon, fahrzeug, notiz, positionen, mwst_prozent } = body

  if (!werkstatt_id || !kunden_name || !fahrzeug || !positionen?.length) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen.' }, { status: 400 })
  }

  const db    = getSupabase()
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const netto = (positionen as AngebotPosition[]).reduce((s, p) => s + (p.betrag || 0), 0)
  const mwst  = mwst_prozent ?? 19
  const gesamt = Math.round(netto * (1 + mwst / 100) * 100) / 100

  const smsSoll = !!kunden_telefon
  const initialStatus = smsSoll ? 'gesendet' : 'entwurf'

  const { data: angebot, error } = await db
    .from('angebote')
    .insert([{ werkstatt_id, anruf_id: anruf_id || null, token, kunden_name, kunden_telefon, fahrzeug, notiz, positionen, gesamt, mwst_prozent: mwst, status: initialStatus }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Anruf-Lead auf "angebot_erstellt" setzen
  if (anruf_id) {
    await db.from('anrufe').update({ status: 'angebot_erstellt' }).eq('id', anruf_id)
  }

  // SMS senden wenn Telefonnummer vorhanden
  if (smsSoll) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://voxaro.vercel.app'
    const link   = `${appUrl}/angebot/${token}`
    const smsText = `Ihr Angebot von der Werkstatt liegt vor. Hier ansehen und genehmigen: ${link}`

    const smsOk = await fetch(`${appUrl}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: kunden_telefon, message: smsText }),
    }).then((r) => r.ok).catch(() => false)

    if (!smsOk) {
      await db.from('angebote').update({ status: 'entwurf' }).eq('id', angebot.id)
    }
  }

  return NextResponse.json({ angebot })
}
