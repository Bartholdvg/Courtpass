"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { submitClubLead } from "@/lib/booking"

type Tab = "club" | "referral"

function AansluitenContent() {
  const params = useSearchParams()
  const initialTab: Tab = params?.get("tab") === "referral" ? "referral" : "club"
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container-max px-4 md:px-6 max-w-2xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-lime mb-2">Groei mee met CourtPass</p>
        <h1 className="font-playfair text-4xl font-bold mb-3">Sluit je club aan, of stel er een voor</h1>
        <p className="text-text2 mb-8">
          Ben je zelf een tennisclub en wil je aansluiten bij CourtPass? Of speel je liever bij een club die er nog niet bij zit? Laat het
          ons weten.
        </p>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab("club")}
            className={`text-sm px-4 py-2 rounded-lg font-semibold ${tab === "club" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
          >
            Ik ben een club
          </button>
          <button
            onClick={() => setTab("referral")}
            className={`text-sm px-4 py-2 rounded-lg font-semibold ${tab === "referral" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
          >
            Ik stel een club voor
          </button>
        </div>

        {tab === "club" ? <ClubInterestForm /> : <ReferralForm />}
      </div>
    </main>
  )
}

export default function AansluitenPage() {
  return (
    <Suspense fallback={null}>
      <AansluitenContent />
    </Suspense>
  )
}

function LeadFormShell({
  onSubmit,
  submitting,
  submitted,
  error,
  children,
}: {
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  submitted: boolean
  error: string
  children: React.ReactNode
}) {
  if (submitted) {
    return (
      <div className="border border-lime/30 bg-lime/5 rounded-2xl p-6 text-center">
        <p className="font-bold text-lg mb-1">Bedankt!</p>
        <p className="text-text2 text-sm mb-4">We nemen zo snel mogelijk contact op.</p>
        <Link href="/" className="text-sm text-lime hover:underline">
          ← Terug naar home
        </Link>
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit} className="border border-border rounded-2xl p-6 space-y-3">
      {children}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-lime text-dark py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Versturen…" : "Versturen"}
      </button>
    </form>
  )
}

function ClubInterestForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [clubName, setClubName] = useState("")
  const [city, setCity] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const field = "w-full bg-dark border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-lime transition-colors"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await submitClubLead({ type: "club_interest", name, email, clubName, city, message })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Versturen mislukt, probeer het later opnieuw.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LeadFormShell onSubmit={handleSubmit} submitting={submitting} submitted={submitted} error={error}>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className={field} />
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mailadres" className={field} />
      <input required value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Naam van de club" className={field} />
      <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Plaats" className={field} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Vertel kort iets over jullie club (optioneel)" rows={4} className={field} />
    </LeadFormShell>
  )
}

function ReferralForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [clubName, setClubName] = useState("")
  const [city, setCity] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const field = "w-full bg-dark border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-lime transition-colors"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await submitClubLead({ type: "referral", name, email, clubName, city, message })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Versturen mislukt, probeer het later opnieuw.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LeadFormShell onSubmit={handleSubmit} submitting={submitting} submitted={submitted} error={error}>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className={field} />
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Jouw e-mailadres" className={field} />
      <input required value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Naam van de club die je voorstelt" className={field} />
      <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Plaats" className={field} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Iets dat ons kan helpen (optioneel)" rows={4} className={field} />
    </LeadFormShell>
  )
}
