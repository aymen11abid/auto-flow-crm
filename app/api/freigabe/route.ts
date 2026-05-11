import { NextRequest, NextResponse } from 'next/server'
import { createFreigabe, fetchOrderById } from '@/lib/db'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  let body: { orderId: string; beschreibung: string; foto_url?: string; betrag?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, beschreibung, foto_url, betrag } = body
  if (!orderId || !beschreibung) {
    return NextResponse.json({ error: 'orderId und beschreibung erforderlich' }, { status: 400 })
  }

  const betragNum = betrag ? parseFloat(betrag) : null
  const { token, error } = await createFreigabe(orderId, beschreibung, foto_url ?? null, betragNum)
  if (error || !token) return NextResponse.json({ error }, { status: 500 })

  // SMS via Twilio
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const auth  = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER

  if (sid && auth && from) {
    try {
      const { order } = await fetchOrderById(orderId)
      if (order?.kunden_telefonnummer) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://auto-flow-crm.vercel.app'
        const link    = `${baseUrl}/freigabe/${token}`
        const msg     = `Hallo ${order.kunden_name}, Ihr Fahrzeug (${order.fahrzeug}) benötigt eine Reparatur. Bitte bestätigen Sie hier: ${link}`
        const client  = twilio(sid, auth)
        await client.messages.create({ body: msg, from, to: order.kunden_telefonnummer })
      }
    } catch (smsErr) {
      // SMS-Fehler darf Freigabe nicht blockieren — nur loggen
      console.error('SMS-Fehler:', smsErr)
    }
  }

  return NextResponse.json({ token })
}
