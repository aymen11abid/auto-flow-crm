import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

interface Body {
  telefonnummer: string
  freigabe_link: string
  beschreibung: string
  werkstatt_name?: string
  foto_url?: string
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { telefonnummer, freigabe_link, beschreibung, werkstatt_name, foto_url: _foto_url } = body

  if (!telefonnummer || !freigabe_link || !beschreibung) {
    return NextResponse.json(
      { success: false, error: 'telefonnummer, freigabe_link und beschreibung sind erforderlich' },
      { status: 400 }
    )
  }

  const absender = werkstatt_name ?? 'Ihre Werkstatt'
  const text =
    `${absender}: Ihr Mechaniker hat ein Problem gefunden.\n\n` +
    `"${beschreibung}"\n\n` +
    `Freigabe hier: ${freigabe_link}`

  try {
    const message = await client.messages.create({
      body: text,
      from: process.env.TWILIO_FROM_NUMBER!,
      to: telefonnummer,
    })
    return NextResponse.json({ success: true, sid: message.sid })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
