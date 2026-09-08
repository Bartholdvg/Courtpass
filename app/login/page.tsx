"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  getCurrentUser,
  getRecoveryParamsFromLocation,
  loadStoredUser,
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  storeAuthUser,
  supabase,
} from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  function goToRedirectOrDashboard() {
    const redirect = searchParams?.get("redirect")
    if (redirect) {
      const extraParams = new URLSearchParams(searchParams?.toString())
      extraParams.delete("redirect")
      // Strip one-time auth params so a consumed OAuth/recovery code never
      // leaks into the destination URL.
      extraParams.delete("code")
      extraParams.delete("type")
      const qs = extraParams.toString()
      router.push(qs ? `${redirect}?${qs}` : redirect)
    } else {
      router.push("/dashboard")
    }
  }

  useEffect(() => {
    const initRecovery = async () => {
      const { accessToken, refreshToken, tokenHash, code, type } = getRecoveryParamsFromLocation(window.location)

      if (type === "recovery" && accessToken && refreshToken) {
        setRecoveryMode(true)
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(() => undefined)
        setRecoveryReady(true)
      } else if (type === "recovery" && tokenHash) {
        setRecoveryMode(true)
        await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).catch(() => undefined)
        setRecoveryReady(true)
      } else if (type === "recovery" && code) {
        setRecoveryMode(true)
        await supabase.auth.exchangeCodeForSession(code).catch(() => undefined)
        setRecoveryReady(true)
      } else if (code) {
        // Not a recovery link, but a ?code= is present — this is Google (or
        // another OAuth provider) redirecting back after signInWithOAuth.
        // detectSessionInUrl is off (see lib/supabase.ts), so exchange it
        // ourselves, same as the recovery branches above.
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          const user = data.user
          const existing = loadStoredUser()
          storeAuthUser({
            email: user.email || existing?.email || "",
            name: user.user_metadata?.full_name || user.user_metadata?.name || existing?.name || user.email?.split("@")[0] || "Speler",
            points: existing?.points ?? 120,
            level: existing?.level ?? "Intermediate",
            location: existing?.location ?? "Amsterdam",
            credits: existing?.credits ?? 8,
            plan: existing?.plan ?? "Pro",
          })
          goToRedirectOrDashboard()
          return
        } catch (err: any) {
          setError(err.message || "Inloggen met Google is mislukt.")
        }
        setRecoveryReady(true)
      } else {
        setRecoveryReady(true)
      }
    }

    initRecovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError("")
    try {
      // Keep the current query string (incl. ?redirect=...) so it survives
      // the round trip to Google and back — Supabase appends its own ?code=
      // to whatever redirectTo we pass.
      await signInWithGoogle(window.location.origin + window.location.pathname + window.location.search)
    } catch (err: any) {
      setError(err.message || "Inloggen met Google is mislukt.")
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      if (tab === "login") {
        await signIn(email, password)
      } else {
        await signUp(email, password, fullName)
      }

      const user = await getCurrentUser().catch(() => null)
      const existing = loadStoredUser()
      const resolvedName =
        user?.user_metadata?.full_name ||
        fullName ||
        existing?.name ||
        email.split("@")[0] ||
        "Speler"

      storeAuthUser({
        email,
        name: resolvedName,
        points: 120,
        level: "Intermediate",
        location: "Amsterdam",
        credits: 8,
        plan: "Pro",
      })

      goToRedirectOrDashboard()
    } catch (err: any) {
      setError(err.message || "Er ging iets mis")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setPasswordLoading(true)
    setError("")
    setSuccessMessage("")

    if (newPassword.length < 6) {
      setError("Gebruik minimaal 6 tekens voor je nieuwe wachtwoord.")
      setPasswordLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("De wachtwoorden komen niet overeen.")
      setPasswordLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccessMessage("Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen.")
      setNewPassword("")
      setConfirmPassword("")
      setRecoveryMode(false)
    } catch (err: any) {
      setError(err.message || "Kon je wachtwoord niet wijzigen")
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setForgotLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      await requestPasswordReset(forgotEmail || email)
      setSuccessMessage("Check je e-mailbox voor een resetlink.")
      setShowForgotPassword(false)
      setForgotEmail("")
    } catch (err: any) {
      setError(err.message || "Kon geen resetlink versturen")
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <main className="min-h-screen pt-20 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border border-border rounded-2xl p-8 bg-surface/50"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-playfair text-3xl font-bold mb-2">
              {recoveryMode ? "Nieuw wachtwoord" : (tab === "login" ? "Welkom terug" : "Maak account")}
            </h1>
            <p className="text-text2 text-sm">
              {recoveryMode
                ? "Stel hier je nieuwe wachtwoord in."
                : (tab === "login" ? "Inloggen op jouw CourtPass account" : "Registreer je en begin vandaag nog")}
            </p>
          </div>

          {!recoveryReady && (
            <div className="mb-4 rounded-lg border border-border/60 bg-surface2/40 p-3 text-sm text-text2">
              Bezig met het verwerken van je herstelverzoek…
            </div>
          )}

          {!recoveryMode && recoveryReady && (
            <div className="flex gap-4 mb-8 border-b border-border pb-4">
              <button
                onClick={() => setTab("login")}
                className={`pb-2 text-sm font-bold transition-colors ${
                  tab === "login" ? "text-lime border-b-2 border-lime" : "text-text2 hover:text-text"
                }`}
              >
                Inloggen
              </button>
              <button
                onClick={() => setTab("register")}
                className={`pb-2 text-sm font-bold transition-colors ${
                  tab === "register" ? "text-lime border-b-2 border-lime" : "text-text2 hover:text-text"
                }`}
              >
                Registreren
              </button>
            </div>
          )}

          {!recoveryMode && recoveryReady && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-border rounded-lg py-3 text-sm font-semibold text-text hover:border-text2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                </svg>
                {googleLoading ? "Bezig…" : "Inloggen met Google"}
              </button>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text3">of met e-mail</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          {/* Form */}
          {recoveryMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm text-text2 mb-2">Nieuw wachtwoord</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-text2 mb-2">Bevestig wachtwoord</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-lime text-dark py-3 rounded-lg font-bold hover:opacity-90 transition-opacity mt-6 cursor-pointer relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? "Bezig..." : "Wachtwoord opslaan"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecoveryMode(false)
                  setTab("login")
                }}
                className="mt-2 block w-full rounded-lg border border-border px-4 py-3 text-sm text-text2"
              >
                Terug naar inloggen
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-lime/10 border border-lime/20 rounded-lg p-3">
                <p className="text-lime text-sm">{successMessage}</p>
              </div>
            )}

            {tab === "register" && (
              <div>
                <label className="block text-sm text-text2 mb-2">Volledige naam</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                  placeholder="Jan de Vries"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-text2 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                placeholder="jouw@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text2 mb-2">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {tab === "login" && !showForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true)
                  setError("")
                  setSuccessMessage("")
                }}
                className="text-sm text-lime hover:underline"
              >
                Wachtwoord vergeten?
              </button>
            )}

            {showForgotPassword && (
              <div className="rounded-lg border border-lime/20 bg-lime/10 p-3 space-y-3">
                <label className="block text-sm text-text2">Vul je e-mailadres in voor een resetlink</label>
                <input
                  type="email"
                  value={forgotEmail || email}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                  placeholder="jouw@email.com"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleForgotPassword()}
                    disabled={forgotLoading}
                    className="flex-1 bg-lime text-dark py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {forgotLoading ? "Versturen..." : "Stuur resetlink"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setForgotEmail("")
                      setError("")
                      setSuccessMessage("")
                    }}
                    className="px-3 py-2 rounded-lg border border-border text-sm"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lime text-dark py-3 rounded-lg font-bold hover:opacity-90 transition-opacity mt-6 cursor-pointer relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Bezig..." : (tab === "login" ? "Inloggen" : "Account aanmaken")}
            </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-text3">
            {tab === "login" ? (
              <>
                Nog geen account?{" "}
                <button onClick={() => setTab("register")} className="text-lime hover:underline font-bold">
                  Registreren
                </button>
              </>
            ) : (
              <>
                Al account?{" "}
                <button onClick={() => setTab("login")} className="text-lime hover:underline font-bold">
                  Inloggen
                </button>
              </>
            )}
          </div>

          <Link href="/" className="block text-center text-sm text-text2 hover:text-text mt-6">
            Terug naar home
          </Link>
        </motion.div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
