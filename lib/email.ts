import { supabase } from "@/lib/supabase"

/** Fire-and-forget — email is a nice-to-have side effect and must never
 * block or fail a booking/split action. Every call site should already be
 * wrapping this in .catch(() => {}), but this also swallows internally so
 * a forgotten .catch() can't surface as an unhandled rejection. */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await supabase.functions.invoke("send-email", { body: { to, subject, html } })
  } catch {
    // best-effort — see comment above
  }
}

const layout = (title: string, bodyHtml: string) => `
  <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #0B1508;">
    <h1 style="font-size: 20px; margin-bottom: 4px;">${title}</h1>
    ${bodyHtml}
    <p style="font-size: 12px; color: #888; margin-top: 24px;">CourtPass</p>
  </div>
`

export interface BookingConfirmationDetails {
  clubName: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  priceCredits: number
  bookingCode: string
}

export function sendBookingConfirmationEmail(to: string, b: BookingConfirmationDetails): Promise<void> {
  const html = layout(
    "Je boeking is bevestigd",
    `
      <p>${b.clubName} · ${b.courtName}</p>
      <p>${new Date(b.date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} · ${b.startTime}–${b.endTime}</p>
      <p>${Math.round(b.priceCredits)} credits</p>
      <p style="font-family: monospace; color: #555;">${b.bookingCode}</p>
    `,
  )
  return sendEmail(to, `Boeking bevestigd — ${b.clubName}`, html)
}

export interface SplitInviteDetails {
  clubName: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  creditsOwed: number
  bookerEmail: string
}

export function sendSplitInviteEmail(to: string, s: SplitInviteDetails): Promise<void> {
  const html = layout(
    "Je bent toegevoegd aan een boeking",
    `
      <p>${s.bookerEmail} heeft je toegevoegd aan een boeking bij ${s.clubName} (${s.courtName}).</p>
      <p>${new Date(s.date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} · ${s.startTime}–${s.endTime}</p>
      <p>Jouw aandeel: ${Math.round(s.creditsOwed)} credits</p>
      <p>Log in op CourtPass om je aandeel te betalen.</p>
    `,
  )
  return sendEmail(to, `Je speelt mee — ${s.clubName}`, html)
}
