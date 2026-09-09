"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScrollObserver from "@/components/ScrollObserver"
import { getCurrentUser, getRankFromPoints, getUserDisplayName, loadStoredUser } from "@/lib/supabase"
import {
  fetchMyBookings,
  fetchMyCreditsBalance,
  fetchMyLedger,
  fetchProfileEmails,
  fetchMyProfileDetails,
  updateMyProfileDetails,
  cancelBooking,
  fetchQrEnabledClubIds,
  encodeQrCheckinPayload,
  selfCheckInBooking,
  type Booking,
  type LedgerEntry,
  type ProfileDetails,
} from "@/lib/booking"
import { fetchBookingsImPlayingIn, fetchMyOwedSplits, fetchSplitsForBookings, payMySplitShare, type BookingSplit, type OwedSplit } from "@/lib/splits"
import { QRCodeSVG } from "qrcode.react"

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
  const [qrEnabledClubIds, setQrEnabledClubIds] = useState<Set<string>>(new Set())
  const [qrBooking, setQrBooking] = useState<Booking | null>(null)
  const [checkInChoiceBooking, setCheckInChoiceBooking] = useState<Booking | null>(null)
  const [geoChecking, setGeoChecking] = useState<string | null>(null)
  const [geoResult, setGeoResult] = useState<Record<string, string>>({})
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

    fetchQrEnabledClubIds()
      .then(setQrEnabledClubIds)
      .catch(() => setQrEnabledClubIds(new Set()))

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

  function handleGeoCheckIn(booking: Booking) {
    if (!navigator.geolocation) {
      setGeoResult((prev) => ({ ...prev, [booking.id]: "Locatie wordt niet ondersteund door je browser." }))
      return
    }
    setGeoChecking(booking.id)
    setGeoResult((prev) => ({ ...prev, [booking.id]: "" }))
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await selfCheckInBooking(booking.id, pos.coords.latitude, pos.coords.longitude)
          if (r.checkedIn) {
            setGeoResult((prev) => ({ ...prev, [booking.id]: r.alreadyCheckedIn ? "Was al ingecheckt." : "Ingecheckt ✓" }))
            await load()
          } else if (!r.withinRange) {
            setGeoResult((prev) => ({ ...prev, [booking.id]: `Je bent nog ${Math.round(r.distanceKm * 1000)}m van de club verwijderd.` }))
          } else if (!r.withinTimeWindow) {
            setGeoResult((prev) => ({ ...prev, [booking.id]: "Inchecken kan pas vanaf 2 uur voor je starttijd." }))
          } else {
            setGeoResult((prev) => ({ ...prev, [booking.id]: "Inchecken niet gelukt." }))
          }
        } catch (err: any) {
          setGeoResult((prev) => ({ ...prev, [booking.id]: err.message || "Inchecken mislukt." }))
        } finally {
          setGeoChecking(null)
        }
      },
      () => {
        setGeoResult((prev) => ({ ...prev, [booking.id]: "Locatietoegang geweigerd." }))
        setGeoChecking(null)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

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
                                  {b.checkedInAt && <span className="ml-2 text-lime">· Ingecheckt ✓</span>}
                                </p>
                              ) : (
                                <p className="text-xs text-text3 mt-0.5">
                                  Geboekt door {splitEmails[b.userId] || "iemand anders"} · <span className="font-mono">{b.bookingCode}</span>
                                </p>
                              )}
                              {isBooker && !canCancel && <p className="text-xs text-yellow-400 mt-0.5">Annuleren kan niet meer (binnen 12 uur voor starttijd)</p>}
                              {geoResult[b.id] && <p className="text-xs text-text2 mt-0.5">{geoResult[b.id]}</p>}
                            </div>
                            <div className="ml-auto flex items-center gap-3 flex-none">
                              <span className="font-mono font-bold text-lime">{Math.round(b.priceCredits)} cr</span>
                              {isBooker && qrEnabledClubIds.has(b.clubId) && !b.checkedInAt && (
                                <button
                                  onClick={() => setCheckInChoiceBooking(b)}
                                  disabled={geoChecking === b.id}
                                  className="text-xs border border-lime/40 text-lime rounded-full px-3 py-1.5 hover:bg-lime/10 disabled:opacity-50"
                                >
                                  {geoChecking === b.id ? "Bezig…" : "Check in"}
                                </button>
                              )}
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
                  <Link href="/aansluiten?tab=referral" className="block w-full border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-center transition-colors text-sm">
                    Stel een club voor
                  </Link>
                </div>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.22}>
              <div className="mt-6">
                <ProfileDetailsCard email={storedUser?.email} />
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.24}>
              <div id="eerdere-boekingen" className="border border-border rounded-2xl p-6 mt-6 scroll-mt-24">
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
      {qrBooking && storedUser?.email && (
        <QrCodeModal booking={qrBooking} email={storedUser.email} onClose={() => setQrBooking(null)} />
      )}
      {checkInChoiceBooking && (
        <CheckInChoiceModal
          onClose={() => setCheckInChoiceBooking(null)}
          onChooseQr={() => {
            setQrBooking(checkInChoiceBooking)
            setCheckInChoiceBooking(null)
          }}
          onChooseLocation={() => {
            handleGeoCheckIn(checkInChoiceBooking)
            setCheckInChoiceBooking(null)
          }}
        />
      )}
    </main>
  )
}

/** One "Check in" button offers a choice between the two check-in methods
 * rather than showing both buttons side by side on every upcoming
 * booking — less clutter, and it reads as one feature with two ways to
 * use it instead of two separate features. */
function CheckInChoiceModal({ onClose, onChooseQr, onChooseLocation }: { onClose: () => void; onChooseQr: () => void; onChooseLocation: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface2 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Hoe wil je inchecken?</h3>
        <p className="text-text2 text-sm mb-5">Kies QR om te laten scannen bij de balie, of check in via je locatie als je al bij de club bent.</p>
        <div className="space-y-2">
          <button onClick={onChooseQr} className="w-full bg-lime text-dark py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
            Toon QR-code
          </button>
          <button onClick={onChooseLocation} className="w-full border border-lime/40 text-lime py-2.5 rounded-lg font-bold text-sm hover:bg-lime/10 transition-colors">
            Check in via locatie
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-4 text-text2 hover:text-text py-1 text-sm transition-colors">
          Annuleren
        </button>
      </div>
    </div>
  )
}

/** Customer-facing check-in QR — shown at the counter for the staff to
 * scan. Encodes the booking code, date and the booker's own email (per
 * check_in_booking's server-side match check) so staff catch a wrong or
 * forged code before it's treated as checked in. */
function QrCodeModal({ booking, email, onClose }: { booking: Booking; email: string; onClose: () => void }) {
  const payload = encodeQrCheckinPayload({ code: booking.bookingCode, date: booking.date, email })
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface2 p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-playfair text-lg font-bold mb-1">{booking.clubName}</p>
        <p className="text-sm text-text2 mb-4">
          {booking.courtName} ·{" "}
          {new Date(booking.date + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} · {booking.startTime}–{booking.endTime}
        </p>
        <div className="inline-block rounded-2xl bg-white p-4">
          <QRCodeSVG value={payload} size={200} bgColor="#ffffff" fgColor="#0D1A0F" />
        </div>
        <p className="mt-4 font-mono text-sm text-lime">{booking.bookingCode}</p>
        <p className="text-xs text-text3 mt-1">Laat dit scannen bij de balie.</p>
        <button onClick={onClose} className="mt-5 w-full border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-sm transition-colors">
          Sluiten
        </button>
      </div>
    </div>
  )
}

/** Phone/address/postcode/city — always empty for a Google sign-in (Google
 * never provides them), so this is the only place those users can ever
 * fill them in. Self-contained: fetches and saves its own state rather
 * than threading through the page's load(). */
function ProfileDetailsCard({ email }: { email?: string }) {
  const [details, setDetails] = useState<ProfileDetails | null>(null)
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [postcode, setPostcode] = useState("")
  const [city, setCity] = useState("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState(false)

  function syncFromDetails(d: ProfileDetails | null) {
    setPhone(d?.phone || "")
    setAddress(d?.address || "")
    setPostcode(d?.postcode || "")
    setCity(d?.city || "")
  }

  useEffect(() => {
    fetchMyProfileDetails()
      .then((d) => {
        setDetails(d)
        syncFromDetails(d)
      })
      .catch(() => setLoadError(true))
  }, [])

  function handleCancel() {
    syncFromDetails(details)
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const updated = { phone: phone.trim() || null, address: address.trim() || null, postcode: postcode.trim() || null, city: city.trim() || null }
      await updateMyProfileDetails(updated)
      setDetails(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silent — the field values stay as typed so the user can just retry
    } finally {
      setSaving(false)
    }
  }

  const field = "w-full bg-dark border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-lime transition-colors"

  return (
    <div id="mijn-gegevens" className="border border-border rounded-2xl p-6 scroll-mt-24">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-lg">Mijn gegevens</h2>
        {!loadError && details && !editing && (
          <button
            onClick={() => setEditing(true)}
            aria-label="Gegevens bewerken"
            className="text-text3 hover:text-lime transition-colors text-sm"
          >
            ✏️
          </button>
        )}
      </div>
      {email && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-text3 font-bold mb-0.5">E-mailadres</p>
          <p className="text-sm text-text2">{email}</p>
        </div>
      )}
      {!loadError && details && (
        <>
          {editing ? (
            <>
              <p className="text-xs text-text3 mb-4">Optioneel — telefoonnummer en adres, handig als je met Google bent ingelogd.</p>
              <div className="space-y-3">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefoonnummer" className={field} />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adres" className={field} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" className={field} />
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Stad" className={field} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-lime text-dark py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? "Bezig…" : "Opslaan"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text3">Telefoonnummer</span>
                <span className="text-text2">{phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Adres</span>
                <span className="text-text2">{address || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Postcode</span>
                <span className="text-text2">{postcode || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Stad</span>
                <span className="text-text2">{city || "—"}</span>
              </div>
              {saved && <p className="text-lime text-xs pt-1">Opgeslagen ✓</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
