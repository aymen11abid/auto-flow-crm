import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { AngebotPosition } from '@/lib/types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function berechneGesamt(
  positionen: AngebotPosition[],
  mwst_prozent: number,
  rabatt_typ: 'prozent' | 'betrag' | null,
  rabatt_wert: number
): { zwischensumme: number; rabatt_absolut: number; netto: number; mwst: number; gesamt: number } {
  const zwischensumme = positionen.reduce((s, p) => s + (p.betrag || 0), 0)
  const rabatt_absolut = rabatt_typ === 'prozent'
    ? zwischensumme * (rabatt_wert / 100)
    : rabatt_typ === 'betrag' ? rabatt_wert : 0
  const netto   = Math.max(0, zwischensumme - rabatt_absolut)
  const mwst    = netto * (mwst_prozent / 100)
  const gesamt  = Math.round((netto + mwst) * 100) / 100
  return { zwischensumme, rabatt_absolut, netto, mwst, gesamt }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { kunden_name, kunden_telefon, fahrzeug, notiz, positionen, mwst_prozent, rabatt_typ, rabatt_wert, gueltig_bis } = body

  if (!kunden_name || !fahrzeug) {
    return NextResponse.json({ error: 'Name und Fahrzeug sind Pflichtfelder.' }, { status: 400 })
  }

  const db = getSupabase()

  const { data: existing, error: fetchErr } = await db
    .from('angebote').select('status').eq('id', id).single()
  if (fetchErr || !existing) return NextResponse.json({ error: 'Angebot nicht gefunden.' }, { status: 404 })

  const { gesamt } = berechneGesamt(
    positionen ?? [],
    mwst_prozent ?? 19,
    rabatt_typ ?? null,
    rabatt_wert ?? 0
  )

  const { error } = await db.from('angebote').update({
    kunden_name,
    kunden_telefon: kunden_telefon ?? '',
    fahrzeug,
    notiz: notiz || null,
    positionen: positionen ?? [],
    mwst_prozent: mwst_prozent ?? 19,
    rabatt_typ: rabatt_typ || null,
    rabatt_wert: rabatt_wert ?? 0,
    gueltig_bis: gueltig_bis || null,
    gesamt,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, gesamt })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { aktion } = await req.json()

  if (aktion !== 'senden') {
    return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 })
  }

  const db = getSupabase()

  const { data: angebot, error: fetchErr } = await db
    .from('angebote').select('*').eq('id', id).single()
  if (fetchErr || !angebot) return NextResponse.json({ error: 'Angebot nicht gefunden.' }, { status: 404 })
  if (angebot.status !== 'entwurf') {
    return NextResponse.json({ error: 'Nur Entwürfe können gesendet werden.' }, { status: 409 })
  }

  const { error } = await db.from('angebote').update({ status: 'gesendet' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (angebot.kunden_telefon) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://voxaro.vercel.app'
    const link   = `${appUrl}/angebot/${angebot.token}`
    const smsText = `Ihr Angebot von der Werkstatt liegt vor. Hier ansehen und genehmigen: ${link}`
    const smsOk = await fetch(`${appUrl}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: angebot.kunden_telefon, message: smsText }),
    }).then((r) => r.ok).catch(() => false)

    if (!smsOk) {
      await db.from('angebote').update({ status: 'entwurf' }).eq('id', id)
      return NextResponse.json({ error: 'SMS-Versand fehlgeschlagen. Bitte Telefonnummer prüfen.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
