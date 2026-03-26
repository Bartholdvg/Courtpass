"use client"

import Link from "next/link"
import ScrollObserver from "@/components/ScrollObserver"
import dynamic from "next/dynamic"

const Map = dynamic(() => import("@/components/Map"), { ssr: false })

export default function ClubsPage() {
  const clubs = [
    {
      name: "Amsterdam Tennis Academy",
      premium: true,
      location: "Amsterdam · Rijksmuseumlaan 1",
      facilities: ["Binnen", "Buiten", "Coaching"],
      status: "Beschikbaar",
      courts: 8,
      price: "2 credits per sessie",
      lat: 52.3576,
      lng: 4.8811,
    },
    {
      name: "Tennisclub Oost",
      premium: false,
      location: "Amsterdam · Linnaeusstraat 89",
      facilities: ["Buiten"],
      status: "Beschikbaar",
      courts: 4,
      price: "1 credit per sessie",
      lat: 52.3642,
      lng: 4.9347,
    },
    {
      name: "Vondelpark Courts",
      premium: false,
      location: "Amsterdam · Vondelpark 3",
      facilities: ["Buiten", "Publiek"],
      status: "Beperkt",
      courts: 6,
      price: "1 credit per sessie",
      lat: 52.3579,
      lng: 4.8686,
    },
    {
      name: "Noord Sportpark",
      premium: false,
      location: "Amsterdam · Buiksloterweg 12",
      facilities: ["Binnen", "Buiten"],
      status: "Beschikbaar",
      courts: 5,
      price: "1 credit per sessie",
      lat: 52.4011,
      lng: 4.9503,
    },
    {
      name: "Rotterdam Tennis Club",
      premium: true,
      location: "Rotterdam · Kralingse Zoom 1",
      facilities: ["Binnen", "Coaching"],
      status: "Beschikbaar",
      courts: 10,
      price: "2 credits per sessie",
      lat: 51.9244,
      lng: 4.4777,
    },
    {
      name: "TC Zuid Rotterdam",
      premium: false,
      location: "Rotterdam · Zuiderpark 5",
      facilities: ["Buiten"],
      status: "Beperkt",
      courts: 6,
      price: "1 credit per sessie",
      lat: 51.8969,
      lng: 4.4907,
    },
    {
      name: "Utrecht Tennis Center",
      premium: true,
      location: "Utrecht · Galgenwaard 1",
      facilities: ["Binnen", "Buiten", "Coaching"],
      status: "Beschikbaar",
      courts: 12,
      price: "2 credits per sessie",
      lat: 52.0783,
      lng: 5.1462,
    },
    {
      name: "Tennisvereniging Lunetten",
      premium: false,
      location: "Utrecht · Koningsweg 55",
      facilities: ["Buiten"],
      status: "Beschikbaar",
      courts: 4,
      price: "1 credit per sessie",
      lat: 52.0647,
      lng: 5.1438,
    },
    {
      name: "Haagse TC",
      premium: false,
      location: "Den Haag · Zuiderpark 10",
      facilities: ["Buiten", "Coaching"],
      status: "Vol",
      courts: 8,
      price: "1 credit per sessie",
      lat: 52.0705,
      lng: 4.3007,
    },
    {
      name: "Tennis Den Haag Centrum",
      premium: true,
      location: "Den Haag · Malieveld 1",
      facilities: ["Binnen"],
      status: "Beschikbaar",
      courts: 6,
      price: "2 credits per sessie",
      lat: 52.0866,
      lng: 4.3136,
    },
    {
      name: "Amstelveen TC",
      premium: false,
      location: "Amstelveen · Sportpark Middenhoven",
      facilities: ["Buiten"],
      status: "Beschikbaar",
      courts: 6,
      price: "1 credit per sessie",
      lat: 52.3000,
      lng: 4.8639,
    },
    {
      name: "Eindhoven Tennis Club",
      premium: false,
      location: "Eindhoven · Sportpark Tongelreep",
      facilities: ["Binnen", "Buiten"],
      status: "Beperkt",
      courts: 8,
      price: "1 credit per sessie",
      lat: 51.4416,
      lng: 5.4697,
    },
  ]

  return (
    <main className="min-h-screen pt-20">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="mb-5">
              <p className="text-sm text-text3">{clubs.length} clubs gevonden</p>
              <h1 className="font-playfair text-5xl md:text-6xl font-black mt-2">Clubs</h1>
            </div>
          </ScrollObserver>

          <ScrollObserver delay={0.1}>
            <Map clubs={clubs} />
          </ScrollObserver>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {clubs.map((club, i) => (
              <ScrollObserver key={club.name} delay={i * 0.04}>
                <article className="border border-border rounded-2xl bg-surface p-5 transition-all hover:border-lime hover:shadow-lg">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg font-bold text-text">{club.name}</h2>
                    {club.premium && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-lime text-dark">⭐ Premium</span>
                    )}
                  </div>
                  <p className="text-text2 text-sm mb-3">
                    <span className="mr-1">📍</span>
                    {club.location}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {club.facilities.map((facility, idx) => (
                      <span key={`${club.name}-${facility}-${idx}`} className="text-xs rounded-full border border-border px-2 py-1 text-text3">
                        {facility}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-sm font-semibold ${club.status === "Vol" ? "text-red-400" : club.status === "Beperkt" ? "text-yellow-300" : "text-lime"}`}>
                      {club.status} · {club.courts} banen
                    </span>
                    <span className="text-sm font-semibold">💳 {club.price}</span>
                  </div>

                  <Link
                    href="/login?tab=register"
                    className={`block text-center rounded-lg py-2 font-semibold text-sm ${club.status === "Vol" ? "bg-gray-600 text-text3 cursor-not-allowed" : "bg-lime text-dark hover:opacity-90"}`}
                    aria-disabled={club.status === "Vol"}
                  >
                    Boek baan →
                  </Link>
                </article>
              </ScrollObserver>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
