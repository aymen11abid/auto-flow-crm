export async function sendSms(to: string, body: string): Promise<void> {
  await fetch(
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
        To:   to,
        Body: body,
      }).toString(),
    }
  )
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
