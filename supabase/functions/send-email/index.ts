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

// The browser sends a CORS preflight (OPTIONS) before the real POST, since
// this call carries a JSON content-type and an Authorization header across
// origins. Without an explicit 2xx + Access-Control-Allow-* response to
// that preflight, the browser aborts before ever sending the real request
// — supabase.functions.invoke() then just throws, which every call site
// here swallows via .catch(() => undefined), so this failed completely
// silently until checked via the function's logs.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders })
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), { status: 500, headers: corsHeaders })
  }

  let body: { to?: string; subject?: string; html?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders })
  }

  const { to, subject, html } = body
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), { status: 400, headers: corsHeaders })
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
    return new Response(JSON.stringify({ error: `Resend error: ${errText}` }), { status: 502, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})
