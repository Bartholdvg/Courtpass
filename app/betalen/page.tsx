"use client"

import Link from "next/link"
import ScrollObserver from "@/components/ScrollObserver"

export default function BetalenPage() {
  return (
    <main className="min-h-screen pt-20">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6 max-w-2xl mx-auto">
          <ScrollObserver delay={0}>
            <h1 className="font-playfair text-5xl font-bold mb-8">Abonnement beheren</h1>
          </ScrollObserver>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Current Plan */}
            <ScrollObserver delay={0.1}>
              <div className="border border-lime/50 bg-surface2 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Hudig abonnement</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-text3 text-sm">Plan</p>
                    <p className="text-2xl font-bold text-lime">Pro Plan</p>
                  </div>
                  <div>
                    <p className="text-text3 text-sm">Kosten</p>
                    <p className="text-xl font-bold">€49/maand</p>
                  </div>
                  <div>
                    <p className="text-text3 text-sm">Vervalt op</p>
                    <p className="font-bold">22 april 2024</p>
                  </div>
                  <button className="w-full border border-muted text-text2 hover:text-text py-2 rounded-lg transition-colors mt-4">
                    Plan wijzigen
                  </button>
                  <button className="w-full bg-red-500/20 text-red-400 py-2 rounded-lg hover:bg-red-500/30 transition-colors">
                    Abonnement opzeggen
                  </button>
                </div>
              </div>
            </ScrollObserver>

            {/* Billing History */}
            <ScrollObserver delay={0.15}>
              <div className="border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Betalingsgeschiedenis</h2>
                <div className="space-y-3">
                  {[
                    { date: "22 maart 2024", amount: "€49,00", status: "Betaald" },
                    { date: "22 februari 2024", amount: "€49,00", status: "Betaald" },
                    { date: "22 januari 2024", amount: "€49,00", status: "Betaald" },
                  ].map((invoice, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
                      <div>
                        <p className="text-sm font-bold">{invoice.date}</p>
                        <p className="text-xs text-text3">{invoice.status}</p>
                      </div>
                      <p className="text-lime font-bold">{invoice.amount}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollObserver>
          </div>

          <ScrollObserver delay={0.2}>
            <div className="mt-12 text-center">
              <p className="text-text2 mb-4">Vragen over je abonnement?</p>
              <Link
                href="/#contact"
                className="inline-block border border-lime text-lime px-6 py-2 rounded-full hover:bg-lime/10 transition-colors"
              >
                Neem contact op
              </Link>
            </div>
          </ScrollObserver>
        </div>
      </section>
    </main>
  )
}
