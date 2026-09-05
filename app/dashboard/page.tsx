"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScrollObserver from "@/components/ScrollObserver"
import { getCurrentUser, getUserDisplayName, loadStoredUser } from "@/lib/supabase"
import { fetchMyBookings, fetchMyCreditsBalance, cancelBooking, type Booking } from "@/lib/booking"

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [credits, setCredits] = useState(0)
  const [error, setError] = useState("")
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const displayName = getUserDisplayName(loadStoredUser())

  async function load() {
    const user = await getCurrentUser()
    if (!user) {
      router.replace("/login?redirect=/dashboard")
      return
    }
    try {
      const [data, balance] = await Promise.all([fetchMyBookings(user.id), fetchMyCreditsBalance()])
      setBookings(data)
      setCredits(balance)
    } catch (err: any) {
      setError(err.message || "Kon je boekingen niet laden.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCancel(id: string) {
    if (!confirm("Deze boeking annuleren?")) return
    setCancellingId(id)
    try {
      await cancelBooking(id)
      await load()
    } catch (err: any) {
      setError(err.message || "Annuleren mislukt.")
    } finally {
      setCancellingId(null)
    }
  }

  const today = todayISO()
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && b.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  const history = bookings
    .filter((b) => b.status === "cancelled" || b.date < today)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))

  if (loading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-text2">Laden…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-20 pb-16">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-lime">Welkom terug</p>
                <h1 className="font-playfair text-4xl md:text-5xl font-bold">{displayName}</h1>
              </div>
              <div className="rounded-2xl border border-lime/30 bg-lime/10 px-5 py-3">
                <p className="text-[10px] uppercase tracking-wider text-text3 font-bold mb-0.5">Credits</p>
                <p className="font-mono text-2xl font-bold text-lime">{Math.round(credits)}</p>
              </div>
            </div>
          </ScrollObserver>

          {error && <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

          <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-6">
            <div>
              <ScrollObserver delay={0.1}>
                <div className="border border-border rounded-2xl p-6 bg-surface/40 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg">Aankomende boekingen</h2>
                    <Link href="/clubs" className="text-sm text-lime hover:text-text transition-colors">
                      + Nieuwe boeking
                    </Link>
                  </div>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-text2">Nog geen aankomende boekingen. Reserveer je eerste baan!</p>
                  ) : (
                    <div className="space-y-3">
                      {upcoming.map((b) => (
                        <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-dark/60 p-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-text truncate">{b.clubName}</p>
                            <p className="text-sm text-text2">
                              {b.courtName} · {new Date(b.date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })} · {b.startTime}–{b.endTime}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-3 flex-none">
                            <span className="font-mono font-bold text-lime">{Math.round(b.priceCredits)} cr</span>
                            <button
                              onClick={() => handleCancel(b.id)}
                              disabled={cancellingId === b.id}
                              className="text-xs border border-red-500/30 text-red-400 rounded-full px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {cancellingId === b.id ? "Bezig…" : "Annuleren"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollObserver>

              <ScrollObserver delay={0.15}>
                <div className="border border-border rounded-2xl p-6">
                  <h2 className="font-bold text-lg mb-4">Eerdere boekingen</h2>
                  {history.length === 0 ? (
                    <p className="text-sm text-text2">Nog geen geschiedenis.</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((b) => (
                        <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 px-4 py-3 text-sm">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex-none ${b.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-surface2 text-text3"}`}>
                            {b.status === "cancelled" ? "Geannuleerd" : "Gespeeld"}
                          </span>
                          <span className="text-text2 min-w-0 truncate">
                            {b.clubName} · {b.courtName} · {b.date}
                          </span>
                          <span className="ml-auto font-mono text-text3 flex-none">{Math.round(b.priceCredits)} cr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollObserver>
            </div>

            <ScrollObserver delay={0.2}>
              <div className="border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Snelle acties</h2>
                <div className="space-y-3">
                  <Link href="/clubs" className="block w-full bg-lime text-dark py-2 rounded-lg font-bold text-center hover:opacity-90 transition-opacity text-sm">
                    Baan reserveren
                  </Link>
                  <Link href="/betalen" className="block w-full border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-center transition-colors text-sm">
                    Abonnement beheren
                  </Link>
                </div>
              </div>
            </ScrollObserver>
          </div>
        </div>
      </section>
    </main>
  )
}
