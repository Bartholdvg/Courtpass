"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import ScrollObserver from "@/components/ScrollObserver"
import Icon from "@/components/Icon"
import { effectivePriceCents, fetchActiveSubscriptionPlans, formatEuros, type SubscriptionPlan } from "@/lib/billing"
import { useLanguage } from "@/lib/i18n"

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
  const { t } = useLanguage()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])

  useEffect(() => {
    fetchActiveSubscriptionPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
  }, [])

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
              <span className="text-xs text-lime font-medium tracking-wider">{t("home.badge")}</span>
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
                {t("home.heroLine1")}
                <br />
                <em className="text-lime not-italic">{t("home.heroEm")}</em>
                <br />
                {t("home.heroLine3")}
              </h1>

              <p className="text-text2 text-lg md:text-base leading-relaxed mb-8 max-w-md font-light">{t("home.heroSubtitle")}</p>

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
                    {t("home.ctaStart")}
                  </Link>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Link
                    href="/clubs"
                    className="inline-block border border-muted text-text2 hover:text-text hover:border-text px-6 py-3 rounded-full transition-all"
                  >
                    {t("home.ctaViewClubs")}
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
                  {t("home.howItWorksLink")}
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
                  <span className="text-sm text-text2">{t("home.socialProof")}</span>
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
                <svg
                  className="h-56 w-full"
                  viewBox="0 0 800 450"
                  preserveAspectRatio="xMidYMid slice"
                  role="img"
                  aria-label="Abstracte illustratie van een tennisbaan van bovenaf"
                >
                  <defs>
                    <radialGradient id="courtGlow" cx="50%" cy="45%" r="75%">
                      <stop offset="0%" stopColor="#BFEF45" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#BFEF45" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect width="800" height="450" fill="#0D1A0F" />
                  <rect width="800" height="450" fill="url(#courtGlow)" />

                  {/* Playing surface */}
                  <rect x="100" y="60" width="600" height="330" rx="6" fill="#132015" />

                  {/* Doubles sidelines */}
                  <rect x="100" y="60" width="600" height="330" rx="6" fill="none" stroke="#BFEF45" strokeWidth="3" opacity="0.85" />

                  {/* Singles sidelines */}
                  <rect x="100" y="100" width="600" height="250" fill="none" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />

                  {/* Service lines */}
                  <line x1="280" y1="100" x2="280" y2="350" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />
                  <line x1="520" y1="100" x2="520" y2="350" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />

                  {/* Center service line */}
                  <line x1="280" y1="225" x2="378" y2="225" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />
                  <line x1="422" y1="225" x2="520" y2="225" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />

                  {/* Center marks on baselines */}
                  <line x1="100" y1="216" x2="112" y2="216" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />
                  <line x1="100" y1="234" x2="112" y2="234" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />
                  <line x1="688" y1="216" x2="700" y2="216" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />
                  <line x1="688" y1="234" x2="700" y2="234" stroke="#BFEF45" strokeWidth="2" opacity="0.45" />

                  {/* Net */}
                  <line x1="400" y1="45" x2="400" y2="405" stroke="#BFEF45" strokeWidth="5" opacity="0.9" />
                  <line x1="400" y1="45" x2="400" y2="405" stroke="#0D1A0F" strokeWidth="5" strokeDasharray="1.5 7" opacity="0.6" />

                  {/* Ball accent */}
                  <circle cx="560" cy="150" r="10" fill="#BFEF45" opacity="0.9" />
                  <path d="M552 143 Q560 150 552 157 M568 143 Q560 150 568 157" stroke="#0D1A0F" strokeWidth="1.5" fill="none" opacity="0.7" />
                </svg>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-playfair text-xl font-bold text-text">{t("home.cardTitle")}</h3>
                    <span className="rounded-full bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">{t("home.cardBadge")}</span>
                  </div>
                  <p className="text-sm text-text2 leading-relaxed">{t("home.cardDesc")}</p>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-border bg-surface2/60 p-3 text-center">
                      <div className="font-playfair text-lg font-bold text-lime">12+</div>
                      <div className="text-[11px] uppercase tracking-wider text-text3 mt-1">{t("home.statClubs")}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface2/60 p-3 text-center">
                      <div className="font-playfair text-lg font-bold text-lime">48u</div>
                      <div className="text-[11px] uppercase tracking-wider text-text3 mt-1">{t("home.statAhead")}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface2/60 p-3 text-center">
                      <div className="font-playfair text-lg font-bold text-lime">€</div>
                      <div className="text-[11px] uppercase tracking-wider text-text3 mt-1">{t("home.statCredits")}</div>
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
              <span className="text-xs text-lime font-medium tracking-wider uppercase">{t("home.howEyebrow")}</span>
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">{t("home.howTitle")}</h2>
              <p className="text-text2 text-lg max-w-xl font-light">{t("home.howSubtitle")}</p>
            </div>
          </ScrollObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-border">
            {[
              { num: "01", icon: "account" as const, title: t("home.step1Title"), desc: t("home.step1Desc") },
              { num: "02", icon: "search" as const, title: t("home.step2Title"), desc: t("home.step2Desc") },
              { num: "03", icon: "calendar" as const, title: t("home.step3Title"), desc: t("home.step3Desc") },
              { num: "04", icon: "tennis" as const, title: t("home.step4Title"), desc: t("home.step4Desc") },
            ].map((step, i) => (
              <ScrollObserver key={i} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center py-8 md:py-12 border-r border-border last:border-r-0 hover:bg-surface/20 transition-colors px-4">
                  <div className="text-4xl font-playfair font-black text-border mb-4">{step.num}</div>
                  <div className="w-14 h-14 rounded-full bg-lime/10 flex items-center justify-center mb-3">
                    <Icon name={step.icon} size={28} className="text-lime" />
                  </div>
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
              <span className="text-xs text-lime font-medium tracking-wider uppercase">{t("home.pricingEyebrow")}</span>
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold mt-4">{t("home.pricingTitle")}</h2>
              <p className="text-text2 text-lg max-w-2xl mx-auto mt-6 font-light">{t("home.pricingSubtitle")}</p>
            </div>
          </ScrollObserver>

          {plans.length === 0 ? (
            <p className="text-center text-text2 text-sm">{t("home.loading")}</p>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
              {plans.map((plan, i) => {
                const price = effectivePriceCents(plan)
                const onSale = price < plan.priceCents
                return (
                  <ScrollObserver key={plan.id} delay={i * 0.1}>
                    <div
                      className={`relative border rounded-2xl p-6 transition-all h-full flex flex-col ${
                        plan.mostChosen
                          ? "border-lime/50 bg-surface2 ring-1 ring-lime/20 transform md:scale-105"
                          : "border-border hover:border-muted"
                      }`}
                    >
                      {plan.mostChosen && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-lime text-dark px-3 py-1 rounded-full text-xs font-bold uppercase">
                          {t("home.popular")}
                        </div>
                      )}
                      <h3 className="text-xs text-text3 uppercase tracking-widest font-bold mb-4">{plan.name}</h3>
                      <div className="mb-2">
                        {onSale && <span className="text-text3 line-through text-sm mr-2">{formatEuros(plan.priceCents)}</span>}
                        <span className="font-playfair text-3xl font-bold text-text">{price === 0 ? t("home.free") : formatEuros(price)}</span>
                        {price > 0 && <span className="text-text2 text-sm">{t("home.perMonth")}</span>}
                      </div>
                      <div className="text-lime font-bold mb-6 text-sm flex-1">
                        {plan.creditsPerMonth > 0 ? `${plan.creditsPerMonth} ${t("home.creditsPerMonth")}` : t("home.noMonthlyCredits")}
                      </div>
                      <Link
                        href="/betalen"
                        className={`w-full py-3 rounded-lg font-bold text-sm transition-all block text-center ${
                          plan.mostChosen
                            ? "bg-lime text-dark hover:opacity-90"
                            : "border border-muted text-text2 hover:text-text hover:border-text"
                        }`}
                      >
                        {t("home.choosePlan")}
                      </Link>
                    </div>
                  </ScrollObserver>
                )
              })}
            </div>
          )}
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
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6">{t("home.ctaBannerTitle")}</h2>
            <Link
              href="/login?tab=register"
              className="inline-block bg-lime text-dark px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
            >
              {t("home.ctaBannerButton")}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section-padding">
        <div className="container-max px-4 md:px-6 max-w-3xl mx-auto">
          <ScrollObserver delay={0}>
            <div className="text-center mb-12">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold">{t("home.contactTitle")}</h2>
              <p className="text-text2 mt-4">{t("home.contactSubtitle")}</p>
            </div>
          </ScrollObserver>

          <form className="space-y-6">
            <ScrollObserver delay={0.1}>
              <div>
                <label className="block text-sm text-text2 mb-2">{t("home.formName")}</label>
                <input
                  type="text"
                  placeholder={t("home.formNamePlaceholder")}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text3 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.15}>
              <div>
                <label className="block text-sm text-text2 mb-2">{t("home.formEmail")}</label>
                <input
                  type="email"
                  placeholder="jouw@email.com"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text3 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
            </ScrollObserver>

            <ScrollObserver delay={0.2}>
              <div>
                <label className="block text-sm text-text2 mb-2">{t("home.formMessage")}</label>
                <textarea
                  placeholder={t("home.formMessagePlaceholder")}
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
                {t("home.formSubmit")}
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
              <p className="text-sm text-text3 font-light">{t("home.footerTagline")}</p>
            </div>
            <div>
              <h4 className="text-xs text-text2 uppercase tracking-wider font-bold mb-4">{t("home.footerProduct")}</h4>
              <ul className="space-y-2 text-sm text-text3">
                <li>
                  <a href="#hoe-het-werkt" className="hover:text-text transition-colors">
                    {t("home.footerHowItWorks")}
                  </a>
                </li>
                <li>
                  <a href="#abonnementen" className="hover:text-text transition-colors">
                    {t("home.footerPricing")}
                  </a>
                </li>
                <li>
                  <Link href="/clubs" className="hover:text-text transition-colors">
                    {t("home.footerClubs")}
                  </Link>
                </li>
                <li>
                  <Link href="/aansluiten" className="hover:text-text transition-colors">
                    {t("home.footerJoinClub")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-text2 uppercase tracking-wider font-bold mb-4">{t("home.footerSupport")}</h4>
              <ul className="space-y-2 text-sm text-text3">
                <li>
                  <a href="#contact" className="hover:text-text transition-colors">
                    {t("home.footerContact")}
                  </a>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-text transition-colors">
                    {t("home.footerFaq")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-text2 uppercase tracking-wider font-bold mb-4">{t("home.footerLegal")}</h4>
              <ul className="space-y-2 text-sm text-text3">
                <li>
                  <Link href="/privacy" className="hover:text-text transition-colors">
                    {t("home.footerPrivacy")}
                  </Link>
                </li>
                <li>
                  <Link href="/voorwaarden" className="hover:text-text transition-colors">
                    {t("home.footerTerms")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text3">
            <p>{t("home.footerRights")}</p>
            <p>{t("home.footerMadeWith")}</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
