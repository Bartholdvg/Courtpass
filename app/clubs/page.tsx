"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import ScrollObserver from "@/components/ScrollObserver"

export default function ClubsPage() {
  const clubs = [
    {
      name: "Tennisclub Oost",
      location: "Amsterdam",
      courts: 6,
      image: "🏟️",
    },
    {
      name: "Tennisclub West",
      location: "Amsterdam",
      courts: 4,
      image: "🎾",
    },
    {
      name: "Tennisclub Zuid",
      location: "Amsterdam",
      courts: 8,
      image: "🏸",
    },
  ]

  return (
    <main className="min-h-screen pt-20">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="mb-12">
              <h1 className="font-playfair text-5xl md:text-6xl font-black mb-6">Alle clubs</h1>
              <p className="text-text2 text-lg max-w-2xl font-light">
                Ontdek alle tennisclubs waar je kunt spelen met jouw CourtPass abonnement.
              </p>
            </div>
          </ScrollObserver>

          <div className="grid md:grid-cols-3 gap-6">
            {clubs.map((club, i) => (
              <ScrollObserver key={i} delay={i * 0.1}>
                <div className="border border-border rounded-2xl overflow-hidden hover:border-muted transition-colors group">
                  <div className="bg-gradient-to-br from-surface to-surface2 p-12 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform">
                    {club.image}
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2">{club.name}</h3>
                    <p className="text-text2 text-sm mb-4">{club.location}</p>
                    <div className="text-sm text-text3 mb-6">
                      <span className="text-lime font-bold">{club.courts}</span> baantjes beschikbaar
                    </div>
                    <Link
                      href="/login?tab=register"
                      className="w-full bg-lime text-dark py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity block text-center"
                    >
                      Reserveren
                    </Link>
                  </div>
                </div>
              </ScrollObserver>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
