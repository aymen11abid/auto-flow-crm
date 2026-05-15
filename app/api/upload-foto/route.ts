import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file      = formData.get('file') as File | null
  const auftragId = formData.get('auftragId') as string | null

  if (!file || !auftragId) {
    return NextResponse.json({ error: 'file und auftragId erforderlich' }, { status: 400 })
  }

  const ext    = file.type === 'image/png' ? 'png' : 'jpg'
  const path   = `${auftragId}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const db = getSupabase()
  const { error } = await db.storage
    .from('freigabe-fotos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('[voxaro] storage upload error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = db.storage.from('freigabe-fotos').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
