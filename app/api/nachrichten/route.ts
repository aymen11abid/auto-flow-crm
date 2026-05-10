import { NextRequest, NextResponse } from 'next/server'
import { fetchNachrichten, sendNachricht } from '@/lib/db'
import type { NachrichtVon } from '@/lib/types'

export async function GET(request: NextRequest) {
  const auftragId = request.nextUrl.searchParams.get('auftragId')
  if (!auftragId) return NextResponse.json({ error: 'auftragId fehlt' }, { status: 400 })

  const { nachrichten, error } = await fetchNachrichten(auftragId)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ nachrichten })
}

export async function POST(request: NextRequest) {
  let body: { auftragId: string; inhalt: string; von: NachrichtVon }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { auftragId, inhalt, von } = body
  if (!auftragId || !inhalt || !von) {
    return NextResponse.json({ error: 'auftragId, inhalt und von sind erforderlich' }, { status: 400 })
  }

  const { nachricht, error } = await sendNachricht(auftragId, inhalt, von)
  if (error || !nachricht) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ nachricht })
}
