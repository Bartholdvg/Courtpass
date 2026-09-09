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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
}

// CourtPass brand tokens (see tailwind.config.ts). Email clients don't load
// web fonts reliably, so these are just fallback-safe font stacks in the
// same spirit as the site's Playfair/DM Sans pairing.
const BRAND = {
  dark: "#0D1A0F",
  surface: "#132015",
  border: "#1E3022",
  lime: "#BFEF45",
  text: "#E8F0E9",
  text2: "#8BAA8F",
  text3: "#4A6650",
  headingFont: "Georgia, 'Times New Roman', serif",
  bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif",
}

function layout(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; background-color: ${BRAND.dark};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.dark}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background-color: ${BRAND.surface}; border: 1px solid ${BRAND.border}; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 28px 32px 0 32px;">
                <span style="font-family: ${BRAND.headingFont}; font-size: 22px; font-weight: 700; color: ${BRAND.text};">Court<span style="color: ${BRAND.lime};">Pass</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 8px 32px;">
                <h1 style="font-family: ${BRAND.headingFont}; font-size: 20px; font-weight: 700; color: ${BRAND.text}; margin: 0 0 16px 0;">${title}</h1>
                <div style="font-family: ${BRAND.bodyFont}; font-size: 14px; line-height: 1.6; color: ${BRAND.text2};">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 28px 32px; border-top: 1px solid ${BRAND.border}; margin-top: 8px;">
                <p style="font-family: ${BRAND.bodyFont}; font-size: 12px; color: ${BRAND.text3}; margin: 16px 0 0 0;">CourtPass · Deze e-mail is automatisch verzonden.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 6px 0; font-family: ${BRAND.bodyFont}; font-size: 13px; color: ${BRAND.text3};">${label}</td>
      <td style="padding: 6px 0; font-family: ${BRAND.bodyFont}; font-size: 13px; color: ${BRAND.text}; text-align: right;">${value}</td>
    </tr>
  `
}

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
  const clubName = escapeHtml(b.clubName)
  const courtName = escapeHtml(b.courtName)
  const bookingCode = escapeHtml(b.bookingCode)
  const body = `
    <p style="margin: 0 0 16px 0;">Je hebt een baan geboekt bij <strong style="color: ${BRAND.text};">${clubName}</strong>. Tot dan!</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.dark}; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
      ${detailRow("Club", clubName)}
      ${detailRow("Baan", courtName)}
      ${detailRow("Datum", formatDate(b.date))}
      ${detailRow("Tijd", `${b.startTime}–${b.endTime}`)}
      ${detailRow("Prijs", `${Math.round(b.priceCredits)} credits`)}
    </table>
    <p style="margin: 0 0 6px 0; font-size: 12px; color: ${BRAND.text3};">Boekingscode</p>
    <p style="margin: 0; display: inline-block; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; color: ${BRAND.lime}; background-color: ${BRAND.dark}; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 8px 14px;">${bookingCode}</p>
  `
  return sendEmail(to, `Boeking bevestigd — ${b.clubName}`, layout("Je boeking is bevestigd", body))
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
  const clubName = escapeHtml(s.clubName)
  const courtName = escapeHtml(s.courtName)
  const bookerEmail = escapeHtml(s.bookerEmail)
  const body = `
    <p style="margin: 0 0 16px 0;"><strong style="color: ${BRAND.text};">${bookerEmail}</strong> heeft je toegevoegd aan een boeking bij <strong style="color: ${BRAND.text};">${clubName}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.dark}; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
      ${detailRow("Club", clubName)}
      ${detailRow("Baan", courtName)}
      ${detailRow("Datum", formatDate(s.date))}
      ${detailRow("Tijd", `${s.startTime}–${s.endTime}`)}
      ${detailRow("Jouw aandeel", `${Math.round(s.creditsOwed)} credits`)}
    </table>
    <p style="margin: 0;">Log in op CourtPass om je aandeel te betalen.</p>
  `
  return sendEmail(to, `Je speelt mee — ${s.clubName}`, layout("Je bent toegevoegd aan een boeking", body))
}
