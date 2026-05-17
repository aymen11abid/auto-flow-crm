function normalizePhone(nr: string): string {
  const clean = nr.replace(/\s/g, '')
  if (clean.startsWith('00')) return '+' + clean.slice(2)
  if (clean.startsWith('0'))  return '+49' + clean.slice(1)
  return clean
}

export async function sendSms(to: string, body: string): Promise<void> {
  const normalized = normalizePhone(to)
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_FROM_NUMBER!,
        To:   normalized,
        Body: body,
      }).toString(),
    }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[voxaro] SMS fehlgeschlagen', { to: normalized, status: res.status, twilio: data })
    throw new Error(`SMS fehlgeschlagen (${res.status}): ${(data as { message?: string }).message ?? 'unbekannt'}`)
  }
  console.log('[voxaro] SMS gesendet an', normalized)
}

export async function sendMeisterAlert(text: string): Promise<void> {
  const to = process.env.WERKSTATT_MEISTER_TELEFON
  if (!to) {
    console.warn('[voxaro] WERKSTATT_MEISTER_TELEFON nicht gesetzt – Meister-Alert übersprungen')
    return
  }
  console.log('[voxaro] Meister-Alert SMS:', text)
  await sendSms(to, text)
}
