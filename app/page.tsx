"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import ScrollObserver from "@/components/ScrollObserver"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

export default function Home() {
  return (
    <main className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 lg:py-28">
        <div className="container-max px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-surface px-3 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-lime rounded-full animate-pulse-subtle" />
              <span className="text-xs text-lime font-medium tracking-wider">NU BESCHIKBAAR IN AMSTERDAM</span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
                Tennis op jouw
                <br />
                <em className="text-lime not-italic">tempo.</em>
                <br />
                Zonder binding.
              </h1>

              <p className="text-text2 text-lg md:text-base leading-relaxed mb-8 max-w-md font-light">
                Eén abonnement. Meerdere clubs. Speel wanneer en waar jij wilt — zonder vast lidmaatschap.
              </p>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col sm:flex-row gap-4 mb-8"
              >
                <motion.div variants={itemVariants}>
                  <Link
                    href="/login?tab=register"
                    className="inline-block bg-lime text-dark px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
                  >
                    Start voor €49/maand
                  </Link>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Link
                    href="/clubs"
                    className="inline-block border border-muted text-text2 hover:text-text hover:border-text px-6 py-3 rounded-full transition-all"
                  >
                    Bekijk clubs →
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-text3"
              >
                <a href="#hoe-het-werkt" className="hover:text-text2 transition-colors">
                  Hoe het werkt ↓
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-10 pt-8 border-t border-border/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {["MK", "RB", "JV", "AL"].map((initials) => (
                      <div
                        key={initials}
                        className="w-7 h-7 rounded-full bg-surface border-2 border-dark flex items-center justify-center text-xs font-medium text-text2"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-text2">Al 200+ spelers gingen je voor</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Tennis Court Visualization */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden md:flex flex-col gap-6"
            >
              <div className="bg-surface border border-border rounded-3xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80"
                  alt="Tennisbaan met spelers in de avond"
                  className="h-56 w-full object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-playfair text-xl font-bold text-text">CourtPass — Tennis zonder binding</h3>
                    <span className="rounded-full bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">Flexibel</span>
                  </div>
                  <p className="text-sm text-text2 leading-relaxed">
                    Reserveer eenvoudig bij meerdere clubs, betaal met credits en speel wanneer het jou uitkomt.
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-border bg-surface2/60 p-3 text-center">
                      <div className="font-playfair text-lg font-bold text-lime">12+</div>
                      <div className="text-[11px] uppercase tracking-wider text-text3 mt-1">Clubs</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface2/60 p-3 text-center">
                      <div className="font-playfair text-lg font-bold text-lime">48u</div>
                      <div className="text-[11px] uppercase tracking-wider text-text3 mt-1">Vooruit</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface2/60 p-3 text-center">
                      <div className="font-playfair text-lg font-bold text-lime">€</div>
                      <div className="text-[11px] uppercase tracking-wider text-text3 mt-1">Credits</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="hoe-het-werkt" className="section-padding bg-surface2/30 border-t border-border">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="mb-12">
              <span className="text-xs text-lime font-medium tracking-wider uppercase">STAP VOOR STAP</span>
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
                Hoe CourtPass werkt
              </h2>
              <p className="text-text2 text-lg max-w-xl font-light">
                Van inschrijven tot je eerste wedstrijd in vier simpele stappen.
              </p>
            </div>
          </ScrollObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-border">
            {[
              {
                num: "01",
                icon: "📋",
                title: "Account aanmaken",
                desc: "Registreer met je e-mailadres en kies je abonnement.",
              },
              {
                num: "02",
                icon: "🔍",
                title: "Clubs ontdekken",
                desc: "Bekijk alle beschikbare clubs in jouw buurt.",
              },
              {
                num: "03",
                icon: "📅",
                title: "Baan reserveren",
                desc: "Reserveer je baantijd voor wanneer jij wilt.",
              },
              {
                num: "04",
                icon: "🎾",
                title: "Spelen!",
                desc: "Show up en geniet van tennis zonder binding.",
              },
            ].map((step, i) => (
              <ScrollObserver key={i} delay={i * 0.1}>
                <div className="py-8 md:py-12 border-r border-border last:border-r-0 hover:bg-surface/20 transition-colors px-4">
                  <div className="text-4xl font-playfair font-black text-border mb-4">{step.num}</div>
                  <div className="text-xl mb-3 text-2xl">{step.icon}</div>
                  <h3 className="text-lg font-medium text-text mb-2">{step.title}</h3>
                  <p className="text-sm text-text2 leading-relaxed font-light">{step.desc}</p>
                </div>
              </ScrollObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="abonnementen" className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="text-center mb-12">
              <span className="text-xs text-lime font-medium tracking-wider uppercase">KIES JE PLAN</span>
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold mt-4">
                Transparante prijzen
              </h2>
              <p className="text-text2 text-lg max-w-2xl mx-auto mt-6 font-light">
                Geen verborgen kosten. Geen contracts. Zeg op elk moment op.
              </p>
            </div>
          </ScrollObserver>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "€49",
                period: "/maand",
                sessions: "4 sessies/maand",
                features: ["Toegang tot alle clubs", "Reserveren tot 48u van tevoren", "Maandelijks opzeggen"],
              },
              {
                name: "Popular",
                price: "€79",
                period: "/maand",
                sessions: "8 sessies/maand",
                features: ["Toegang tot alle clubs", "Reserveren tot 48u van tevoren", "Voorrangstoegang", "Community forum"],
                popular: true,
              },
              {
                name: "Pro",
                price: "€119",
                period: "/maand",
                sessions: "Onbeperkt",
                features: ["Alle clubs incl. privébanen", "Prioriteit bij reserveren", "Gratis gastcredits", "20% korting op coaching"],
              },
            ].map((plan, i) => (
              <ScrollObserver key={i} delay={i * 0.1}>
                <div
                  className={`relative border rounded-2xl p-6 transition-all ${
                    plan.popular
                      ? "border-lime/50 bg-surface2 ring-1 ring-lime/20 transform md:scale-105"
                      : "border-border hover:border-muted"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-lime text-dark px-3 py-1 rounded-full text-xs font-bold uppercase">
                      POPULAIR
                    </div>
                  )}
                  <h3 className="text-xs text-text3 uppercase tracking-widest font-bold mb-4">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="font-playfair text-4xl font-bold text-text">{plan.price}</span>
                    <span className="text-text2 text-sm">{plan.period}</span>
                  </div>
                  <div className="text-lime font-bold mb-6">{plan.sessions}</div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="text-sm text-text2 flex gap-2">
                        <span className="text-lime text-lg leading-none">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login?tab=register"
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all block text-center ${
                      plan.popular
                        ? "bg-lime text-dark hover:opacity-90"
                        : "border border-muted text-text2 hover:text-text hover:border-text"
                    }`}
                  >
                    Kies plan
                  </Link>
                </div>
              </ScrollObserver>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="section-padding border-t border-b border-border bg-surface2/50">
        <div className="container-max px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6">
              Klaar om zonder binding te spelen?
            </h2>
            <Link
              href="/login?tab=register"
              className="inline-block bg-lime text-dark px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Start gratis proefperiode
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section-padding">
        <div className="container-max px-4 md:px-6 max-w-3xl mx-auto">
          <ScrollObserver delay={0}>
            <div className="text-center mb-12">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold">Contact opnemen</h2>
              <p className="text-text2 mt-4">Vragen? Laat het ons weten.</p>
            </div>
          </ScrollObserver>

          <form className="space-y-6">
            <ScrollObserver delay={0.1}>
              <div>
                <label className="block text-sm text-text2 mb-2">Naam</label>
                <input
                  type="text"
                  placeholder="Jouw naam"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text3 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.15}>
              <div>
                <label className="block text-sm text-text2 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="jouw@email.com"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text3 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.2}>
              <div>
                <label className="block text-sm text-text2 mb-2">Bericht</label>
                <textarea
                  placeholder="Jouw bericht..."
                  rows={5}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text3 focus:outline-none focus:border-lime transition-colors resize-none"
                />
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.25}>
              <button
                type="submit"
                className="w-full bg-lime text-dark py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Verstuur bericht
              </button>
            </ScrollObserver>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark border-t border-border py-12">
        <div className="container-max px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-border">
            <div>
              <Link href="/" className="font-playfair font-bold text-lg block mb-4">
                Court<span className="text-lime">Pass</span>
              </Link>
              <p className="text-sm text-text3 font-light">Tennis zonder binding.</p>
            </div>
            <div>
              <h4 className="text-xs text-text2 uppercase tracking-wider font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-text3">
                <li>
                  <a href="#hoe-het-werkt" className="hover:text-text transition-colors">
                    Hoe het werkt
                  </a>
                </li>
                <li>
                  <a href="#abonnementen" className="hover:text-text transition-colors">
                    Prijzen
                  </a>
                </li>
                <li>
                  <Link href="/clubs" className="hover:text-text transition-colors">
                    Clubs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-text2 uppercase tracking-wider font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-text3">
                <li>
                  <a href="#contact" className="hover:text-text transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-text transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-text2 uppercase tracking-wider font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-text3">
                <li>
                  <a href="#" className="hover:text-text transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-text transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text3">
            <p>© 2024 CourtPass. Alle rechten voorbehouden.</p>
            <p>Made with ❤️ for tennis players</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
