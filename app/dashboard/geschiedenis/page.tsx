"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase"
import { fetchMyBookings, type Booking } from "@/lib/booking"
import { fetchBookingsImPlayingIn } from "@/lib/splits"

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function BookingHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState("")
  const [historySort, setHistorySort] = useState<"playDate" | "bookedDate">("playDate")

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.replace("/login?redirect=/dashboard/geschiedenis")
        return
      }
      try {
        const [mine, playingIn] = await Promise.all([fetchMyBookings(user.id), fetchBookingsImPlayingIn(user.id)])
        const merged = new Map<string, Booking>()
        for (const b of [...mine, ...playingIn]) merged.set(b.id, b)
        setBookings([...merged.values()])
      } catch (err: any) {
        setError(err.message || "Kon je boekingen niet laden.")
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today = todayISO()
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
        <div className="container-max px-4 md:px-6 max-w-3xl mx-auto">
          <Link href="/dashboard" className="text-sm text-text2 hover:text-text transition-colors mb-6 inline-block">
            ← Terug naar dashboard
          </Link>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold mb-6">Eerdere boekingen</h1>

          {error && <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-base text-red-400">{error}</div>}

          <div className="border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              {history.length > 0 && (
                <div className="flex items-center gap-2 text-sm ml-auto">
                  <span className="text-text3">Sorteer op</span>
                  <button
                    onClick={() => setHistorySort("playDate")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-colors ${historySort === "playDate" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
                  >
                    Speeldatum
                  </button>
                  <button
                    onClick={() => setHistorySort("bookedDate")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-colors ${historySort === "bookedDate" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
                  >
                    Boekingsdatum
                  </button>
                </div>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-base text-text2">Nog geen geschiedenis.</p>
            ) : (
              <div className="space-y-3">
                {history.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 px-4 py-3.5 text-base">
                    <span className={`text-xs uppercase font-bold px-2.5 py-1 rounded-full flex-none ${b.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-surface2 text-text3"}`}>
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
        </div>
      </section>
    </main>
  )
}
