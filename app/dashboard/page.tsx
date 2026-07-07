"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScrollObserver from "@/components/ScrollObserver"
import { getUserDisplayName, loadStoredUser, type CourtPassUser, updateStoredUser } from "@/lib/supabase"

const clubOffers = [
  { club: "Tennisclub Oost", district: "Amsterdam Oost", points: 20, credits: 4, cost: "€14", courts: 3, level: "Alle niveaus" },
  { club: "Vondelpark Courts", district: "Amsterdam Zuid", points: 24, credits: 6, cost: "€18", courts: 2, level: "Gevorderd" },
  { club: "Noord Sportpark", district: "Amsterdam Noord", points: 16, credits: 3, cost: "€11", courts: 4, level: "Beginner" },
]

const nearbyPlayers = [
  { name: "Mila", level: "Intermediate", district: "Amsterdam Oost", points: 168, availability: "Vandaag 19:00" },
  { name: "Jeroen", level: "Advanced", district: "Amsterdam Zuid", points: 242, availability: "Morgen 18:30" },
  { name: "Sara", level: "Beginner", district: "Amsterdam Noord", points: 84, availability: "Vrijdag 17:00" },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<CourtPassUser | null>(null)
  const [search, setSearch] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("Alle niveaus")

  useEffect(() => {
    const storedUser = loadStoredUser()
    if (!storedUser) {
      router.replace("/login")
      return
    }
    setUser(storedUser)
  }, [router])

  const filteredPlayers = useMemo(() => {
    return nearbyPlayers.filter((player) => {
      const matchesQuery = `${player.name} ${player.district}`.toLowerCase().includes(search.toLowerCase())
      const matchesLevel = selectedLevel === "Alle niveaus" || player.level === selectedLevel
      return matchesQuery && matchesLevel
    })
  }, [search, selectedLevel])

  const handleMatchResult = (result: "win" | "loss" | "neutral") => {
    if (!user) return
    let nextPoints = user.points
    if (result === "win") nextPoints += 15
    if (result === "loss") nextPoints = Math.max(0, nextPoints - 10)

    const updated = updateStoredUser({ points: nextPoints })
    if (updated) setUser(updated)
  }

  if (!user) return null

  return (
    <main className="min-h-screen pt-20 pb-16">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-lime">Welkom terug</p>
                <h1 className="font-playfair text-4xl md:text-5xl font-bold">{getUserDisplayName(user)}</h1>
              </div>
              <div className="rounded-full border border-lime/20 bg-lime/10 px-4 py-2 text-sm text-lime">
                {user.rank} · {user.points} punten
              </div>
            </div>
          </ScrollObserver>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <ScrollObserver delay={0.1}>
              <div className="border border-border rounded-2xl p-6 bg-surface/50">
                <h3 className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">Credits</h3>
                <p className="text-2xl font-bold text-lime">{user.credits}</p>
                <p className="text-text2 text-sm mt-2">Beschikbaar voor jouw volgende sessie</p>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.15}>
              <div className="border border-border rounded-2xl p-6 bg-surface/50">
                <h3 className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">Rank</h3>
                <p className="text-2xl font-bold">{user.rank}</p>
                <p className="text-text2 text-sm mt-2">Niveau {user.level} · {user.location}</p>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.2}>
              <div className="border border-border rounded-2xl p-6 bg-surface/50">
                <h3 className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">Plan</h3>
                <p className="text-2xl font-bold">{user.plan}</p>
                <p className="text-text2 text-sm mt-2">Maandelijks opzegbaar · 24/7 toegang</p>
              </div>
            </ScrollObserver>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
            <ScrollObserver delay={0.25}>
              <div className="border border-border rounded-2xl p-6 bg-surface/40">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-lg">Club kaarten</h2>
                    <p className="text-sm text-text2">Bekijk punten, credits, kosten en beschikbare banen.</p>
                  </div>
                  <Link href="/clubs" className="text-sm text-lime hover:text-text transition-colors">
                    Meer clubs →
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {clubOffers.map((club) => (
                    <div key={club.club} className="rounded-2xl border border-border/70 bg-dark/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-text">{club.club}</h3>
                          <p className="text-sm text-text2">{club.district}</p>
                        </div>
                        <span className="rounded-full bg-lime/10 px-3 py-1 text-xs text-lime">{club.level}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-text2">
                        <div><span className="block text-xs uppercase text-text3">Credits</span><span className="text-text font-medium">{club.credits}</span></div>
                        <div><span className="block text-xs uppercase text-text3">Kosten</span><span className="text-text font-medium">{club.cost}</span></div>
                        <div><span className="block text-xs uppercase text-text3">Banen</span><span className="text-text font-medium">{club.courts} vrij</span></div>
                        <div><span className="block text-xs uppercase text-text3">Score</span><span className="text-text font-medium">{club.points} pts</span></div>
                      </div>
                      <Link href="/clubs" className="mt-4 inline-flex rounded-full bg-lime px-4 py-2 text-sm font-semibold text-dark hover:opacity-90 transition-opacity">
                        Reserveer
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.3}>
              <div className="border border-border rounded-2xl p-6 bg-surface/40">
                <h2 className="font-bold text-lg mb-4">Ranking & matchresultaat</h2>
                <p className="text-sm text-text2 mb-4">Na een match kun je punten verdienen of verliezen. Speel ook zonder ranking-impact.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => handleMatchResult("win")} className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-dark">Winst +15</button>
                  <button onClick={() => handleMatchResult("loss")} className="rounded-full border border-border px-4 py-2 text-sm">Verlies -10</button>
                  <button onClick={() => handleMatchResult("neutral")} className="rounded-full border border-border px-4 py-2 text-sm">Spelen zonder punten</button>
                </div>
                <div className="mt-5 rounded-2xl border border-border/70 bg-dark/70 p-4 text-sm text-text2">
                  <p><span className="text-lime font-semibold">Huidig niveau:</span> {user.rank}</p>
                  <p><span className="text-lime font-semibold">Puntentotaal:</span> {user.points}</p>
                  <p><span className="text-lime font-semibold">Volgende stap:</span> speel 3 matches om je ranking verder te groeien.</p>
                </div>
              </div>
            </ScrollObserver>
          </div>

          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
            <ScrollObserver delay={0.35}>
              <div className="border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Zoek iemand in de buurt</h2>
                <p className="text-sm text-text2 mb-4">Vind een sparringpartner op jouw niveau in jouw regio.</p>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Zoek op naam of buurt"
                    className="w-full rounded-xl border border-border bg-dark px-4 py-3 text-sm text-text placeholder:text-text3"
                  />
                  <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="rounded-xl border border-border bg-dark px-4 py-3 text-sm text-text">
                    <option>Alle niveaus</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {filteredPlayers.map((player) => (
                    <div key={player.name} className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface/40 px-4 py-3">
                      <div>
                        <p className="font-semibold text-text">{player.name}</p>
                        <p className="text-sm text-text2">{player.level} · {player.district}</p>
                        <p className="text-xs text-text3">Beschikbaar: {player.availability}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-lime">{player.points} pts</p>
                        <button className="mt-2 rounded-full border border-lime/30 px-3 py-1 text-xs text-lime">Vraag uit</button>
                      </div>
                    </div>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-text2">Geen spelers gevonden. Probeer een andere zoekterm of niveau.</div>
                  )}
                </div>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.4}>
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
