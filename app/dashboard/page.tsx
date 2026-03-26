"use client"

import Link from "next/link"
import ScrollObserver from "@/components/ScrollObserver"

export default function DashboardPage() {
  return (
    <main className="min-h-screen pt-20">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <h1 className="font-playfair text-5xl font-bold mb-8">Dashboard</h1>
          </ScrollObserver>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <ScrollObserver delay={0.1}>
              <div className="border border-border rounded-2xl p-6 bg-surface/50">
                <h3 className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">Volgende reservering</h3>
                <p className="text-2xl font-bold text-lime">Zaterdag 28 maart</p>
                <p className="text-text2 text-sm mt-2">Tennisclub Oost • 14:00 - 15:30</p>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.15}>
              <div className="border border-border rounded-2xl p-6 bg-surface/50">
                <h3 className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">Speelden deze maand</h3>
                <p className="text-2xl font-bold">6 uur</p>
                <p className="text-text2 text-sm mt-2">Gemiddeld 2 per week</p>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.2}>
              <div className="border border-border rounded-2xl p-6 bg-surface/50">
                <h3 className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">Je abonnement</h3>
                <p className="text-2xl font-bold">Pro Plan</p>
                <p className="text-text2 text-sm mt-2">€49/maand • Nog 28 dagen</p>
              </div>
            </ScrollObserver>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ScrollObserver delay={0.1}>
              <div className="border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Gemaakte reserveringen</h2>
                <div className="space-y-3">
                  {["Maandag • 18:00", "Woensdag • 19:00", "Zaterdag • 14:00"].map((time, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
                      <span className="text-text2">{time}</span>
                      <span className="text-lime text-sm font-bold">Bevestigd</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.15}>
              <div className="border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Snelle acties</h2>
                <div className="space-y-3">
                  <Link
                    href="/clubs"
                    className="block w-full bg-lime text-dark py-2 rounded-lg font-bold text-center hover:opacity-90 transition-opacity text-sm"
                  >
                    Baan reserveren
                  </Link>
                  <Link
                    href="/betalen"
                    className="block w-full border border-border text-text2 hover:text-text py-2 rounded-lg font-bold text-center transition-colors text-sm"
                  >
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
