// CourtPass — transactional email sender (booking confirmations, split
// invites). Thin wrapper around Resend's API; the API key lives only as an
// Edge Function secret (RESEND_API_KEY), never in client code.
//
// Deploy: supabase functions deploy send-email
// Secret: supabase secrets set RESEND_API_KEY=re_xxx
//
// verify_jwt stays on (the default) — only a signed-in CourtPass user can
// invoke this, same as every other RPC in this app. It does not re-check
// that the caller actually owns the booking/club it's emailing about
// (consistent with this app's existing client-trusted design, see the
// credits/wallet system's disclosed simplifications) — worst case of
// misuse here is a stray email, not a financial exploit.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "CourtPass <onboarding@resend.dev>"

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), { status: 500 })
  }

  let body: { to?: string; subject?: string; html?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const { to, subject, html } = body
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), { status: 400 })
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    return new Response(JSON.stringify({ error: `Resend error: ${errText}` }), { status: 502 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
})
