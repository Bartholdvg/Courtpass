"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import {
  type Club,
  type Court,
  type BookedSlot,
  type Booking,
  fetchClubs,
  fetchPricingModel,
  fetchBookedSlots,
  getTimeSlots,
  getAvailableCourts,
  isTimeAvailable,
  hasAnyAvailability,
  getPrice,
  getFromPrice,
  createBooking,
  BookingUnavailableError,
  InsufficientCreditsError,
} from "@/lib/booking"
import { fetchForecast, getRainBucket, isForecastLive } from "@/lib/weather"
import { haversineKm, type PricingModel } from "@/lib/pricing"
import { AUTH_CHANGED_EVENT, getCurrentUser } from "@/lib/supabase"
import { createBookingSplit, resolveUserIdByEmail } from "@/lib/splits"

interface ParticipantInput {
  mode: "email" | "guest"
  value: string
  /** Share as a whole percentage (0-100) of the total, easier to reason
   * about than a credit amount with decimals — credits are always whole
   * numbers now, but a % is still simpler to adjust by hand. */
  percent: number
}

/** Equal percentage split across `n` players (whole numbers, remainder to
 * index 0, the booker) — e.g. 3 players -> [34, 33, 33]. */
function equalPercents(n: number): number[] {
  const base = Math.floor(100 / n)
  const remainder = 100 - base * n
  const shares = Array(n).fill(base)
  shares[0] += remainder
  return shares
}

const BookingMap = dynamic(() => import("@/components/BookingMap"), { ssr: false })

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
]
const DOW = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]

function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function todayISO(): string {
  return dateISO(new Date())
}

export default function ClubsPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])
  const [model, setModel] = useState<PricingModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [monthSlots, setMonthSlots] = useState<BookedSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [daySlots, setDaySlots] = useState<BookedSlot[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null)
  const [, setWeatherTick] = useState(0)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [bookingError, setBookingError] = useState("")
  const [insufficientCredits, setInsufficientCredits] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [playerCount, setPlayerCount] = useState(1)
  const [participants, setParticipants] = useState<ParticipantInput[]>([])
  const [splitError, setSplitError] = useState("")
  const [splitSummary, setSplitSummary] = useState<{ credits: number; label: string }[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [clubsData, modelData] = await Promise.all([fetchClubs(), fetchPricingModel()])
        if (cancelled) return
        setClubs(clubsData)
        setModel(modelData)
      } catch (err: any) {
        if (!cancelled) setLoadError(err.message || "Kon clubs niet laden.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    const checkAuth = () => {
      getCurrentUser().then((u) => {
        if (!cancelled) setIsAuthenticated(!!u)
      })
    }
    checkAuth()
    window.addEventListener(AUTH_CHANGED_EVENT, checkAuth)
    return () => {
      cancelled = true
      window.removeEventListener(AUTH_CHANGED_EVENT, checkAuth)
    }
  }, [])

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || null
  const selectedCourt: Court | null = selectedClub?.courts.find((c) => c.id === selectedCourtId) || null

  const nearbyClubIds = useMemo(() => {
    if (!selectedClub || !model) return []
    return clubs.filter((c) => c.id !== selectedClub.id && haversineKm(selectedClub, c) <= model.settings.radiusKm).map((c) => c.id)
  }, [selectedClub, clubs, model])

  // Bookings for the whole visible month (selected club only) — for calendar day-greying.
  useEffect(() => {
    if (!selectedClub) {
      setMonthSlots([])
      return
    }
    let cancelled = false
    const start = dateISO(calMonth)
    const end = dateISO(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0))
    fetchBookedSlots([selectedClub.id], start, end)
      .then((slots) => {
        if (!cancelled) setMonthSlots(slots)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedClub, calMonth])

  // Bookings for the selected day (club + nearby clubs) — for court availability and pricing inputs.
  useEffect(() => {
    if (!selectedClub || !selectedDate || !model) {
      setDaySlots([])
      return
    }
    let cancelled = false
    fetchBookedSlots([selectedClub.id, ...nearbyClubIds], selectedDate, selectedDate)
      .then((slots) => {
        if (!cancelled) setDaySlots(slots)
      })
      .catch(() => {})
    fetchForecast(selectedClub.id, selectedDate, selectedClub.lat, selectedClub.lng, model.settings.weatherApi).then((changed) => {
      if (changed && !cancelled) setWeatherTick((t) => t + 1)
    })
    return () => {
      cancelled = true
    }
  }, [selectedClub, selectedDate, model, nearbyClubIds])

  function selectClub(id: string) {
    setSelectedClubId(id)
    setCalMonth(() => {
      const n = new Date()
      return new Date(n.getFullYear(), n.getMonth(), 1)
    })
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedCourtId(null)
    setBookingError("")
    setPlayerCount(1)
    setParticipants([])
    setSplitError("")
  }

  function setPlayers(n: number) {
    setPlayerCount(n)
    setParticipants((prev) => {
      const percents = equalPercents(n)
      return Array.from({ length: n - 1 }, (_, i) => ({
        mode: prev[i]?.mode ?? "email",
        value: prev[i]?.value ?? "",
        percent: percents[i + 1] ?? 0,
      }))
    })
    setSplitError("")
  }

  function backToClubs() {
    setSelectedClubId(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedCourtId(null)
  }

  async function handleBook() {
    if (!selectedClub || !selectedCourt || !selectedDate || !selectedTime || !model) return
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      setIsAuthenticated(false)
      router.push("/login?redirect=/clubs")
      return
    }
    setIsBooking(true)
    setBookingError("")
    setInsufficientCredits(false)
    setSplitError("")
    try {
      const weatherBucket = getRainBucket(selectedClub.id, selectedDate, model.settings.rainForecast)
      const price = getPrice(selectedClub, clubs, daySlots, selectedDate, selectedTime, model, weatherBucket)
      if (price.error) throw new Error(price.error)
      const totalCredits = Math.round(price.finalPrice)

      let resolvedParticipants: { userId: string | null; guestName: string | null; credits: number; label: string }[] | null = null
      if (playerCount > 1) {
        const others: { userId: string | null; guestName: string | null; credits: number; label: string }[] = []
        for (const p of participants) {
          if (!p.value.trim()) throw new Error("Vul voor elke medespeler een e-mailadres of gastnaam in.")
          const credits = Math.round((totalCredits * p.percent) / 100)
          if (p.mode === "email") {
            const userId = await resolveUserIdByEmail(p.value)
            if (!userId) throw new Error(`Geen account gevonden met e-mailadres "${p.value}".`)
            others.push({ userId, guestName: null, credits, label: p.value })
          } else {
            others.push({ userId: null, guestName: p.value.trim(), credits, label: `${p.value.trim()} (gast)` })
          }
        }
        const othersTotal = others.reduce((s, o) => s + o.credits, 0)
        const bookerShare = totalCredits - othersTotal
        if (bookerShare < 0) {
          throw new Error("De opgetelde percentages van je medespelers zijn hoger dan 100%. Pas ze aan.")
        }
        resolvedParticipants = [{ userId: currentUser.id, guestName: null, credits: bookerShare, label: "Jij" }, ...others]
      }

      const weatherSource = isForecastLive(selectedClub.id, selectedDate) ? "forecast API" : "admin fallback"
      const result = await createBooking(selectedClub, selectedCourt, selectedDate, selectedTime, price, weatherSource)
      setBooking(result)

      if (resolvedParticipants) {
        try {
          await createBookingSplit(
            result.id,
            resolvedParticipants.map((p) => ({ userId: p.userId, guestName: p.guestName, credits: p.credits })),
          )
          setSplitSummary(resolvedParticipants.map((p) => ({ credits: p.credits, label: p.label })))
        } catch (splitErr: any) {
          setSplitError(
            "De boeking is gelukt, maar het splitsen van de kosten is mislukt: " + (splitErr.message || "onbekende fout") +
              ". Je hebt de volledige prijs betaald.",
          )
        }
      }
    } catch (err: any) {
      if (err instanceof BookingUnavailableError) {
        setBookingError(err.message)
        setSelectedCourtId(null)
        fetchBookedSlots([selectedClub.id, ...nearbyClubIds], selectedDate, selectedDate).then(setDaySlots).catch(() => {})
      } else if (err instanceof InsufficientCreditsError) {
        setBookingError(err.message)
        setInsufficientCredits(true)
      } else {
        setBookingError(err.message || "Kon niet boeken, probeer opnieuw.")
      }
    } finally {
      setIsBooking(false)
    }
  }

  function resetAfterBooking() {
    setBooking(null)
    setSelectedClubId(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedCourtId(null)
    setPlayerCount(1)
    setParticipants([])
    setSplitError("")
    setSplitSummary(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-text2">Clubs laden…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-red-400">{loadError}</p>
      </main>
    )
  }

  if (booking) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-lime text-dark flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
          <h2 className="font-playfair text-2xl font-bold mb-2">Je staat op de baan</h2>
          <p className="text-text2 mb-1">
            {booking.clubName} · {booking.courtName}
          </p>
          <p className="text-text2 mb-4">
            {new Date(booking.date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {booking.startTime}–{booking.endTime}
          </p>
          <p className="font-mono text-lime text-xs mb-6">{booking.bookingCode}</p>
          <div className="font-mono text-3xl font-bold text-lime mb-4">
            {Math.round(booking.priceCredits)} <span className="text-sm text-text2 font-normal">credits</span>
          </div>
          {splitSummary && (
            <div className="text-left border border-border rounded-xl p-4 mb-6 text-sm">
              <p className="font-bold mb-2">Verdeeld over {splitSummary.length} spelers</p>
              {splitSummary.map((s, i) => (
                <div key={i} className="flex justify-between text-text2">
                  <span>{s.label}</span>
                  <span className="font-mono">{Math.round(s.credits)} cr</span>
                </div>
              ))}
              <p className="text-text3 text-xs mt-2">De anderen zien een openstaand verzoek op hun dashboard.</p>
            </div>
          )}
          {splitError && <p className="text-yellow-400 text-sm mb-6 max-w-sm">{splitError}</p>}
          <button onClick={resetAfterBooking} className="bg-lime text-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">
            Boek nog een baan
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-20">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] h-[70vh] lg:h-[calc(100vh-5rem)]">
        <div className="h-72 lg:h-full">
          <BookingMap clubs={clubs} selectedClubId={selectedClubId} onSelectClub={selectClub} />
        </div>

        <aside className="border-t lg:border-t-0 lg:border-l border-border bg-surface overflow-y-auto">
          <div className="p-5">
            {!selectedClub ? (
              <>
                <p className="text-xs text-text3 uppercase tracking-wider font-bold mb-1">Vind een baan</p>
                <h1 className="font-playfair text-2xl font-bold mb-4">{clubs.length} clubs</h1>
                <div className="space-y-2">
                  {clubs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClub(c.id)}
                      className="w-full flex items-center gap-3 border border-border rounded-xl p-3 bg-surface2 hover:border-lime/50 transition-colors text-left"
                    >
                      <span className="w-9 h-9 flex-none rounded-lg bg-dark border border-border flex items-center justify-center font-mono text-lime text-sm">
                        {c.tier.replace("Tier ", "")}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-text truncate">{c.name}</span>
                        <span className="block text-xs text-text3 truncate">
                          {c.address} · {c.courts.length} banen
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button onClick={backToClubs} className="text-xs text-text2 hover:text-text mb-3">
                  ← Alle clubs
                </button>
                <h1 className="font-playfair text-2xl font-bold">{selectedClub.name}</h1>
                <p className="text-text3 text-sm mb-4">{selectedClub.address}</p>

                <div className="grid grid-cols-2 gap-2 mb-5 text-sm">
                  <div className="border border-border rounded-lg p-2.5 bg-surface2">
                    <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">Tier</div>
                    <div className="font-semibold">{selectedClub.tier}</div>
                  </div>
                  <div className="border border-border rounded-lg p-2.5 bg-surface2">
                    <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">Banen</div>
                    <div className="font-semibold">{selectedClub.courts.length}</div>
                  </div>
                  <div className="border border-border rounded-lg p-2.5 bg-surface2 col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">Openingstijden</div>
                    <div className="font-semibold">
                      {selectedClub.openFrom}–{selectedClub.openTo}
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold mb-2">1 · Kies een datum</h3>
                {model && (
                  <div className="bg-surface2 border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        disabled={new Date(calMonth.getFullYear(), calMonth.getMonth(), new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()) < new Date(new Date().setHours(0, 0, 0, 0))}
                        onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                        className="w-7 h-7 rounded border border-border text-text2 hover:text-lime disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ‹
                      </button>
                      <b className="font-playfair text-sm">
                        {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                      </b>
                      <button
                        disabled={(() => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const last = new Date(today)
                          last.setDate(last.getDate() + model.settings.bookingHorizonDays)
                          return new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1) > last
                        })()}
                        onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                        className="w-7 h-7 rounded border border-border text-text2 hover:text-lime disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ›
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {DOW.map((d) => (
                        <span key={d} className="text-[10px] text-text3 text-center">
                          {d}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const last = new Date(today)
                        last.setDate(last.getDate() + model.settings.bookingHorizonDays)
                        const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
                        const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()
                        const lead = (first.getDay() + 6) % 7
                        const cells = []
                        for (let i = 0; i < lead; i++) cells.push(<span key={`empty-${i}`} />)
                        for (let d = 1; d <= daysInMonth; d++) {
                          const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), d)
                          const iso = dateISO(date)
                          const outOfRange = date < today || date > last
                          const full = !outOfRange && !hasAnyAvailability(selectedClub, model, monthSlots, iso)
                          const disabled = outOfRange || full
                          cells.push(
                            <button
                              key={iso}
                              disabled={disabled}
                              title={full ? "Geen banen beschikbaar" : undefined}
                              onClick={() => {
                                setSelectedDate(iso)
                                setSelectedTime(null)
                                setSelectedCourtId(null)
                              }}
                              className={`aspect-square rounded-md text-xs flex items-center justify-center transition-colors
                                ${disabled ? "opacity-25 line-through cursor-not-allowed text-text3" : "text-text hover:bg-dark"}
                                ${iso === selectedDate ? "!bg-lime !text-dark font-bold" : "bg-dark/40"}
                                ${iso === todayISO() ? "ring-1 ring-border" : ""}`}
                            >
                              {d}
                            </button>,
                          )
                        }
                        return cells
                      })()}
                    </div>
                    <p className="text-[10px] text-text3 mt-2 text-center">Boekbaar tot {model.settings.bookingHorizonDays} dagen vooruit.</p>
                  </div>
                )}

                {selectedDate && model && (
                  <>
                    <h3 className="text-sm font-bold mt-5 mb-2">2 · Kies een tijd</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {getTimeSlots(selectedClub, model).map((t) => {
                        const open = isTimeAvailable(selectedClub, daySlots, selectedDate, t)
                        const weatherBucket = getRainBucket(selectedClub.id, selectedDate, model.settings.rainForecast)
                        const from = open ? getFromPrice(selectedClub, clubs, daySlots, selectedDate, t, model, weatherBucket) : null
                        return (
                          <button
                            key={t}
                            disabled={!open}
                            onClick={() => {
                              setSelectedTime(t)
                              setSelectedCourtId(null)
                            }}
                            className={`rounded-lg border p-2 text-center text-sm transition-colors
                              ${t === selectedTime ? "bg-lime border-lime text-dark" : "border-border bg-surface2 text-text"}
                              disabled:opacity-30 disabled:line-through disabled:cursor-not-allowed`}
                          >
                            <div className="font-semibold">{t}</div>
                            {open && from && !from.error && (
                              <div className={`text-[11px] mt-0.5 font-mono ${t === selectedTime ? "text-dark/70" : "text-lime"}`}>
                                {Math.round(from.finalPrice)} cr
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-text3 mt-2">Doorgestreepte tijden hebben geen vrije baan.</p>
                  </>
                )}

                {selectedDate && selectedTime && model && (
                  <>
                    <h3 className="text-sm font-bold mt-5 mb-2">3 · Beschikbare banen</h3>
                    {(() => {
                      const courts = getAvailableCourts(selectedClub, daySlots, selectedDate, selectedTime)
                      const weatherBucket = getRainBucket(selectedClub.id, selectedDate, model.settings.rainForecast)
                      if (!courts.length) return <p className="text-sm text-text3">Geen banen meer beschikbaar op dit tijdstip.</p>
                      return courts.map((court) => {
                        const price = getPrice(selectedClub, clubs, daySlots, selectedDate, selectedTime, model, weatherBucket)
                        return (
                          <button
                            key={court.id}
                            onClick={() => setSelectedCourtId(court.id)}
                            className={`w-full flex items-center gap-3 border rounded-xl p-3 mb-2 text-left transition-colors
                              ${court.id === selectedCourtId ? "border-lime bg-lime/10" : "border-border bg-surface2 hover:border-lime/50"}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{court.name}</span>
                              <span className="block text-xs text-text3">
                                {court.indoor ? "Binnen" : "Buiten"} · {court.surface}
                              </span>
                            </span>
                            <span className="ml-auto text-right flex-none">
                              <span className="block font-mono font-bold text-lime">{price.error ? "—" : Math.round(price.finalPrice)}</span>
                              <span className="block text-[10px] text-text3">credits</span>
                            </span>
                          </button>
                        )
                      })
                    })()}
                  </>
                )}

                {selectedCourt && selectedDate && selectedTime && model && (
                  <div className="bg-dark border border-border rounded-xl p-4 mt-5">
                    <h4 className="text-sm font-bold mb-3">Jouw boeking</h4>
                    <div className="text-xs space-y-1.5 text-text2 mb-3">
                      <div className="flex justify-between">
                        <span>Baan</span>
                        <span className="text-text">{selectedCourt.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Datum</span>
                        <span className="text-text">
                          {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tijd</span>
                        <span className="text-text">
                          {selectedTime} – {(parseInt(selectedTime, 10) + 1).toString().padStart(2, "0")}:00
                        </span>
                      </div>
                    </div>

                    {bookingError && (
                      <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg p-2 mb-3">
                        {bookingError}
                        {insufficientCredits && (
                          <Link href="/betalen?tab=credits" className="block underline mt-1 text-red-300 hover:text-red-200">
                            Credits bijkopen →
                          </Link>
                        )}
                      </div>
                    )}

                    {(() => {
                      const weatherBucket = getRainBucket(selectedClub.id, selectedDate, model.settings.rainForecast)
                      const price = getPrice(selectedClub, clubs, daySlots, selectedDate, selectedTime, model, weatherBucket)
                      const loggedIn = isAuthenticated === true
                      const totalCredits = price.error ? 0 : Math.round(price.finalPrice)
                      const othersPercent = participants.reduce((s, p) => s + (Number(p.percent) || 0), 0)
                      const myPercent = 100 - othersPercent
                      const myShare = totalCredits - participants.reduce((s, p) => s + Math.round((totalCredits * (Number(p.percent) || 0)) / 100), 0)

                      function updateParticipant(i: number, patch: Partial<ParticipantInput>) {
                        setParticipants((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))
                      }

                      return (
                        <>
                          {loggedIn && (
                            <div className="border-t border-dashed border-border pt-3 mb-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-text2">Met hoeveel spelers?</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4].map((n) => (
                                    <button
                                      key={n}
                                      onClick={() => setPlayers(n)}
                                      className={`w-8 h-8 rounded-lg text-sm font-bold ${
                                        playerCount === n ? "bg-lime text-dark" : "border border-border text-text2"
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {playerCount > 1 && (
                                <div className="space-y-2 mb-2">
                                  {participants.map((p, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <select
                                        value={p.mode}
                                        onChange={(e) => updateParticipant(i, { mode: e.target.value as "email" | "guest" })}
                                        className="bg-dark border border-border rounded-lg px-1.5 py-1.5 text-[11px]"
                                      >
                                        <option value="email">Account</option>
                                        <option value="guest">Gast</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={p.value}
                                        onChange={(e) => updateParticipant(i, { value: e.target.value })}
                                        placeholder={p.mode === "email" ? "e-mail" : "naam"}
                                        className="flex-1 min-w-0 bg-dark border border-border rounded-lg px-2 py-1.5 text-xs"
                                      />
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={p.percent}
                                        onChange={(e) => updateParticipant(i, { percent: Number(e.target.value) })}
                                        className="w-14 bg-dark border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-right"
                                      />
                                      <span className="text-[10px] text-text3 w-4">%</span>
                                      <span className="text-[10px] text-text3 font-mono w-10 text-right">
                                        {Math.round((totalCredits * (Number(p.percent) || 0)) / 100)} cr
                                      </span>
                                    </div>
                                  ))}
                                  <div className={`flex justify-between text-xs ${myPercent < 0 ? "text-red-400" : "text-text2"}`}>
                                    <span>Jouw aandeel</span>
                                    <span className="font-mono font-bold">
                                      {myPercent}% · {myShare} cr
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-baseline justify-between border-t border-dashed border-border pt-3">
                            <span className="text-sm font-bold">Dynamische prijs</span>
                            <span className="font-mono font-bold text-lime text-lg">
                              {price.error ? "—" : totalCredits} <small className="text-text3 text-xs font-normal">credits</small>
                            </span>
                          </div>
                          <button
                            onClick={handleBook}
                            disabled={isBooking || !!price.error || (playerCount > 1 && myShare < 0)}
                            className="w-full mt-4 bg-lime text-dark py-3 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {isBooking
                              ? "Bezig…"
                              : loggedIn
                                ? `Boek baan · ${price.error ? "—" : playerCount > 1 ? myShare : totalCredits} credits`
                                : "Log in om te boeken"}
                          </button>
                        </>
                      )
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
