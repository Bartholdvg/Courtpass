"use client"

import ScrollObserver from "@/components/ScrollObserver"

export default function ClubAdminPage() {
  return (
    <main className="min-h-screen pt-20">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <h1 className="font-playfair text-5xl font-bold mb-8">Club Admin Panel</h1>
          </ScrollObserver>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Totale reserveringen", value: "342", color: "text-lime" },
              { label: "Actieve leden", value: "156", color: "text-blue-400" },
              { label: "Inkomsten deze maand", value: "€7.644", color: "text-green-400" },
            ].map((stat, i) => (
              <ScrollObserver key={i} delay={i * 0.1}>
                <div className="border border-border rounded-2xl p-6 bg-surface/50">
                  <p className="text-text3 text-sm uppercase tracking-wider font-bold mb-2">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </ScrollObserver>
            ))}
          </div>

          <ScrollObserver delay={0.3}>
            <div className="border border-border rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-6">Snelle acties</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button className="bg-lime text-dark py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">
                  Toevoegen Baan
                </button>
                <button className="border border-border text-text2 hover:text-text py-3 rounded-lg font-bold transition-colors">
                  Leden beheren
                </button>
                <button className="border border-border text-text2 hover:text-text py-3 rounded-lg font-bold transition-colors">
                  Instellingen
                </button>
              </div>
            </div>
          </ScrollObserver>
        </div>
      </section>
    </main>
  )
}
