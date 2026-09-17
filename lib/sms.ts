const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN!
const FROM        = process.env.TWILIO_FROM!
const TO          = process.env.ALERT_PHONE!

export async function sendAdminSMS(message: string) {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM || !TO) {
    console.warn("sms: Twilio env vars not set — skipping")
    return
  }

  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")

  const body = new URLSearchParams({ From: FROM, To: TO, Body: message })

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("sms: Twilio error", err)
    }
  } catch (e) {
    console.error("sms: fetch failed", e)
  }
}
