import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchOrderByFreigabeToken, fetchFreigabenByToken, resolveFreigabePosition } from '@/lib/db'
import { sendMeisterAlert } from '@/lib/sms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { order, error } = await fetchOrderByFreigabeToken(token)
  if (error || !order) {
    return NextResponse.json({ error: error ?? 'Nicht gefunden' }, { status: 404 })
  }
  const freigaben = await fetchFreigabenByToken(token)
  return NextResponse.json({ order, freigaben })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  let body: { freigabeId: string; result: 'approved' | 'rejected' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.freigabeId || (body.result !== 'approved' && body.result !== 'rejected')) {
    return NextResponse.json({ error: 'freigabeId und result erforderlich' }, { status: 400 })
  }

  const error = await resolveFreigabePosition(body.freigabeId, token, body.result)
  if (error) return NextResponse.json({ error }, { status: 500 })

  if (body.result === 'rejected') {
    const db = getSupabase()
    const { data: freigabe } = await db
      .from('freigaben')
      .select('beschreibung')
      .eq('id', body.freigabeId)
      .single()
    await sendMeisterAlert(
      `Voxaro: Freigabe abgelehnt – ${freigabe?.beschreibung ?? 'Zusatzarbeit'}`
    )
  }

  return NextResponse.json({ success: true })
}
