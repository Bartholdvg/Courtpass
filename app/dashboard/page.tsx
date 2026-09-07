"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScrollObserver from "@/components/ScrollObserver"
import { getCurrentUser, getRankFromPoints, getUserDisplayName, loadStoredUser } from "@/lib/supabase"
import { fetchMyBookings, fetchMyCreditsBalance, fetchMyLedger, fetchProfileEmails, cancelBooking, type Booking, type LedgerEntry } from "@/lib/booking"
import { fetchBookingsImPlayingIn, fetchMyOwedSplits, fetchSplitsForBookings, payMySplitShare, type BookingSplit, type OwedSplit } from "@/lib/splits"

const LEDGER_LABELS: Record<string, string> = {
  topup: "Credits gekocht",
  subscription_grant: "Abonnement toekenning",
  booking_charge: "Baan geboekt",
  booking_refund: "Terugbetaling",
  split_received: "Ontvangen (gesplitst)",
  split_paid: "Betaald (gesplitst)",
  rollover_expiry: "Vervallen credits",
  adjustment: "Aanpassing",
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [credits, setCredits] = useState(0)
  const [creditsError, setCreditsError] = useState(false)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [error, setError] = useState("")
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [historySort, setHistorySort] = useState<"playDate" | "bookedDate">("playDate")
  const [owedSplits, setOwedSplits] = useState<OwedSplit[]>([])
  const [owedCompanions, setOwedCompanions] = useState<Record<string, BookingSplit[]>>({})
  const [mySplits, setMySplits] = useState<Record<string, BookingSplit[]>>({})
  const [splitEmails, setSplitEmails] = useState<Record<string, string>>({})
  const [payingSplitId, setPayingSplitId] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const storedUser = loadStoredUser()
  const displayName = getUserDisplayName(storedUser)
  const rank = storedUser?.rank || getRankFromPoints(storedUser?.points ?? 0)

  async function load() {
    const user = await getCurrentUser()
    if (!user) {
      router.replace("/login?redirect=/dashboard")
      return
    }
    setMyUserId(user.id)

    try {
      const [mine, playingIn] = await Promise.all([fetchMyBookings(user.id), fetchBookingsImPlayingIn(user.id)])
      const merged = new Map<string, Booking>()
      for (const b of [...mine, ...playingIn]) merged.set(b.id, b)
      const allBookings = [...merged.values()]
      setBookings(allBookings)

      const bookingIds = allBookings.map((b) => b.id)
      fetchSplitsForBookings(bookingIds)
        .then((splits) => {
          setMySplits(splits)
          const userIds = Object.values(splits)
            .flat()
            .map((s) => s.userId)
            .filter((id): id is string => !!id && id !== user.id)
          if (userIds.length) fetchProfileEmails(userIds).then((m) => setSplitEmails((prev) => ({ ...prev, ...m }))).catch(() => {})
        })
        .catch(() => setMySplits({}))
    } catch (err: any) {
      setError(err.message || "Kon je boekingen niet laden.")
    }

    try {
      const balance = await fetchMyCreditsBalance()
      setCredits(balance)
      setCreditsError(false)
    } catch {
      setCreditsError(true)
    } finally {
      setLoading(false)
    }

    fetchMyLedger(8)
      .then(setLedger)
      .catch(() => setLedger([]))

    fetchMyOwedSplits()
      .then(async (owed) => {
        setOwedSplits(owed)
        const bookingIds = [...new Set(owed.map((o) => o.bookingId))]
        const companions = await fetchSplitsForBookings(bookingIds).catch(() => ({}))
        setOwedCompanions(companions)

        const ids = new Set<string>()
        owed.forEach((o) => o.bookerId && ids.add(o.bookerId))
        Object.values(companions)
          .flat()
          .forEach((s) => s.userId && ids.add(s.userId))
        ids.delete(user.id)
        if (ids.size) fetchProfileEmails([...ids]).then((m) => setSplitEmails((prev) => ({ ...prev, ...m }))).catch(() => {})
      })
      .catch(() => setOwedSplits([]))
  }

  async function handlePaySplit(splitId: string) {
    setPayingSplitId(splitId)
    try {
      await payMySplitShare(splitId)
      await load()
    } catch (err: any) {
      setError(err.message || "Betalen mislukt.")
    } finally {
      setPayingSplitId(null)
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
    .sort((a, b) =>
      historySort === "bookedDate"
        ? b.createdAt.localeCompare(a.createdAt)
        : (b.date + b.startTime).localeCompare(a.date + a.startTime),
    )

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
                {rank && <p className="mt-1 text-sm text-text2">Rank: <span className="text-lime font-semibold">{rank}</span></p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-lime/30 bg-lime/10 px-5 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text3 font-bold mb-0.5">Credits</p>
                  {creditsError ? (
                    <p className="text-xs text-text2">Niet beschikbaar</p>
                  ) : (
                    <p className="font-mono text-2xl font-bold text-lime">{Math.round(credits)}</p>
                  )}
                </div>
                <Link
                  href="/betalen?tab=credits"
                  className="rounded-2xl border border-border px-4 py-3 text-sm font-bold text-text2 hover:text-text hover:border-muted transition-colors"
                >
                  + Bijkopen
                </Link>
              </div>
            </div>
          </ScrollObserver>

          {error && <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
          {creditsError && (
            <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
              Je creditsaldo kon niet worden geladen. Waarschijnlijk moet de laatste database-migratie nog worden uitgevoerd.
            </div>
          )}

          {owedSplits.length > 0 && (
            <ScrollObserver delay={0.05}>
              <div className="mb-6 rounded-2xl border border-lime/30 bg-lime/5 p-5">
                <h2 className="font-bold text-lg mb-1">Openstaande verzoeken</h2>
                <p className="text-text2 text-sm mb-4">Iemand heeft een baan voor je geboekt — jouw aandeel:</p>
                <div className="space-y-2">
                  {owedSplits.map((s) => {
                    const bookerLabel = splitEmails[s.bookerId] || s.bookerId
                    const others = (owedCompanions[s.bookingId] || [])
                      .filter((c) => c.id !== s.id && c.userId !== s.bookerId)
                      .map((c) => (c.guestName ? `${c.guestName} (gast)` : c.userId ? splitEmails[c.userId] || c.userId : "?"))
                    return (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-dark/60 p-3 text-sm">
                        <span className="min-w-0">
                          <span className="block font-semibold text-text truncate">{s.clubName} · {s.courtName}</span>
                          <span className="block text-text3 text-xs">
                            {new Date(s.date + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} · {s.startTime}–{s.endTime}
                          </span>
                          <span className="block text-text3 text-xs mt-0.5">Geboekt door {bookerLabel}</span>
                          {others.length > 0 && <span className="block text-text3 text-xs">Ook mee: {others.join(", ")}</span>}
                        </span>
                        <span className="ml-auto font-mono font-bold text-lime">{Math.round(s.credits)} cr</span>
                        <button
                          onClick={() => handlePaySplit(s.id)}
                          disabled={payingSplitId === s.id}
                          className="bg-lime text-dark px-3 py-1.5 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-50"
                        >
                          {payingSplitId === s.id ? "Bezig…" : "Betalen"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollObserver>
          )}

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
                      {upcoming.map((b) => {
                        const isBooker = b.userId === myUserId
                        const startsAt = new Date(`${b.date}T${b.startTime}`)
                        const canCancel = isBooker && startsAt.getTime() - Date.now() > 12 * 60 * 60 * 1000
                        return (
                          <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-dark/60 p-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-text truncate">{b.clubName}</p>
                              <p className="text-sm text-text2">
                                {b.courtName} · {new Date(b.date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })} · {b.startTime}–{b.endTime}
                              </p>
                              {isBooker ? (
                                <p className="text-xs text-text3 mt-0.5">
                                  Geboekt op {new Date(b.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })} · <span className="font-mono">{b.bookingCode}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-text3 mt-0.5">
                                  Geboekt door {splitEmails[b.userId] || "iemand anders"} · <span className="font-mono">{b.bookingCode}</span>
                                </p>
                              )}
                              {isBooker && !canCancel && <p className="text-xs text-yellow-400 mt-0.5">Annuleren kan niet meer (binnen 12 uur voor starttijd)</p>}
                            </div>
                            <div className="ml-auto flex items-center gap-3 flex-none">
                              <span className="font-mono font-bold text-lime">{Math.round(b.priceCredits)} cr</span>
                              {canCancel && (
                                <button
                                  onClick={() => handleCancel(b.id)}
                                  disabled={cancellingId === b.id}
                                  className="text-xs border border-red-500/30 text-red-400 rounded-full px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  {cancellingId === b.id ? "Bezig…" : "Annuleren"}
                                </button>
                              )}
                            </div>
                            {(() => {
                              const splits = mySplits[b.id]
                              if (!splits || splits.length <= 1) return null
                              return (
                                <div className="w-full border-t border-border/50 mt-1 pt-2 space-y-1">
                                  {splits.map((s) => {
                                    const pct = Math.round((s.credits / b.priceCredits) * 100)
                                    const label = s.guestName ? `${s.guestName} (gast)` : !s.userId ? "?" : splitEmails[s.userId] || "Jij"
                                    return (
                                      <div key={s.id} className="flex items-center gap-2 text-xs">
                                        <span className="min-w-0 flex-1 truncate text-text2">{label}</span>
                                        <span className="font-mono text-text3">{pct}% · {Math.round(s.credits)} cr</span>
                                        <span
                                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex-none ${
                                            s.status === "paid"
                                              ? "bg-lime/10 text-lime"
                                              : s.status === "covered_by_booker"
                                                ? "bg-surface2 text-text3"
                                                : "bg-yellow-500/10 text-yellow-400"
                                          }`}
                                        >
                                          {s.status === "paid" ? "Betaald" : s.status === "covered_by_booker" ? "Door jou gedekt" : "Wacht op betaling"}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollObserver>

              <ScrollObserver delay={0.15}>
                <div className="border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h2 className="font-bold text-lg">Eerdere boekingen</h2>
                    {history.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-text3">Sorteer op</span>
                        <button
                          onClick={() => setHistorySort("playDate")}
                          className={`px-2.5 py-1 rounded-full font-medium transition-colors ${historySort === "playDate" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
                        >
                          Speeldatum
                        </button>
                        <button
                          onClick={() => setHistorySort("bookedDate")}
                          className={`px-2.5 py-1 rounded-full font-medium transition-colors ${historySort === "bookedDate" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
                        >
                          Boekingsdatum
                        </button>
                      </div>
                    )}
                  </div>
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
                            <span className="text-text3"> · geboekt op {new Date(b.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</span>
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
                  <Link href="/betalen?tab=credits" className="block w-full border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-center transition-colors text-sm">
                    Credits bijkopen
                  </Link>
                  <Link href="/betalen" className="block w-full border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-center transition-colors text-sm">
                    Abonnement beheren
                  </Link>
                </div>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.25}>
              <div className="border border-border rounded-2xl p-6 mt-6">
                <h2 className="font-bold text-lg mb-4">Credits geschiedenis</h2>
                {ledger.length === 0 ? (
                  <p className="text-sm text-text2">Nog geen mutaties.</p>
                ) : (
                  <div className="space-y-2">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 text-sm border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-text truncate">{LEDGER_LABELS[entry.type] || entry.type}</p>
                          <p className="text-xs text-text3">{new Date(entry.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</p>
                        </div>
                        <span className={`font-mono font-bold flex-none ${entry.credits >= 0 ? "text-lime" : "text-text2"}`}>
                          {entry.credits >= 0 ? "+" : ""}
                          {Math.round(entry.credits)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollObserver>
          </div>
        </div>
      </section>
    </main>
  )
}
