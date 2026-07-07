"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getRecoveryParamsFromLocation, requestPasswordReset, supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    const initRecovery = async () => {
      try {
        const { accessToken, refreshToken, tokenHash, code, type } = getRecoveryParamsFromLocation(window.location)

        if (accessToken && refreshToken && type === "recovery") {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        } else if (tokenHash && type === "recovery") {
          await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        } else if (code && type === "recovery") {
          await supabase.auth.exchangeCodeForSession(code)
        } else {
          setError("Deze herstellink is verlopen, is al gebruikt of is niet juist. Vraag een nieuwe resetlink aan via het inlogscherm.")
        }
      } catch (err: any) {
        setError(err.message || "Deze herstellink is verlopen, is al gebruikt of is niet juist. Vraag een nieuwe resetlink aan via het inlogscherm.")
      } finally {
        setReady(true)
      }
    }

    initRecovery()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 6) {
      setError("Gebruik minimaal 6 tekens voor je nieuwe wachtwoord.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("De wachtwoorden komen niet overeen.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccess("Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen.")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err.message || "Kon je wachtwoord niet wijzigen.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendLink = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) {
      setError("Vul je e-mailadres in om een nieuwe resetlink te ontvangen.")
      return
    }

    setResendLoading(true)
    setError("")
    setSuccess("")

    try {
      await requestPasswordReset(email)
      setSuccess("Er is een nieuwe resetlink verstuurd. Check je e-mail.")
    } catch (err: any) {
      setError(err.message || "Kon geen nieuwe resetlink versturen.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl border border-border bg-surface/50 p-8"
      >
        <h1 className="font-playfair text-3xl font-bold mb-2">Nieuw wachtwoord</h1>
        <p className="text-sm text-text2 mb-6">
          Stel hier je nieuwe wachtwoord in voor je CourtPass account.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-lime/20 bg-lime/10 p-3 text-sm text-lime">
            {success}
          </div>
        )}

        {!ready && !error ? (
          <div className="text-sm text-text2">Bezig met het verwerken van je herstellink…</div>
        ) : error ? (
          <div className="space-y-4">
            <form onSubmit={handleResendLink} className="space-y-3">
              <div>
                <label className="mb-2 block text-sm text-text2">E-mailadres</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-dark px-4 py-3 text-text focus:border-lime focus:outline-none"
                  placeholder="jouw@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={resendLoading}
                className="w-full rounded-lg bg-lime px-4 py-3 font-semibold text-dark transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {resendLoading ? "Versturen..." : "Nieuwe resetlink sturen"}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-text2">Nieuw wachtwoord</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-dark px-4 py-3 text-text focus:border-lime focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-text2">Bevestig wachtwoord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-dark px-4 py-3 text-text focus:border-lime focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-lime px-4 py-3 font-semibold text-dark transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Bezig..." : "Wachtwoord opslaan"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-text3 space-y-2">
          <Link href="/login" className="block text-lime hover:underline">
            Terug naar inloggen
          </Link>
          {error && (
            <Link href="/login" className="block text-text2 hover:underline">
              Nieuwe resetlink aanvragen
            </Link>
          )}
        </div>
      </motion.div>
    </main>
  )
}
