"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ScrollObserver from "@/components/ScrollObserver"
import { loadStoredUser } from "@/lib/supabase"
import { savePendingCreditPurchase } from "@/lib/booking"

const PAYMENT_LINKS: Record<string, string> = {
  price_1TCxrjFgp1PZQf1VtYsHjD8u: "https://buy.stripe.com/test_fZuaEXflj4Nk3ot9O34sE00",
  price_1TCxt3Fgp1PZQf1V4loQwqLk: "https://buy.stripe.com/test_3cI6oH2yxfrY5wB9O34sE01",
  price_1TCxwwFgp1PZQf1VaiuY1KBl: "https://buy.stripe.com/test_6oU5kDehfenU3ot4tJ4sE02",
  price_1TCyAlFgp1PZQf1VA8igAUtg: "https://buy.stripe.com/test_fZucN5ddb4Nk6AF8JZ4sE06",
  price_1TCyFjFgp1PZQf1VOMgg3qJx: "https://buy.stripe.com/test_14AdR93CBcfMcZ31hx4sE03",
  price_1TCyBEFgp1PZQf1V2OlIDgoK: "https://buy.stripe.com/test_4gM5kD4GF93A0ch1hx4sE05",
  price_1TCyBZFgp1PZQf1VMwmrEdRx: "https://buy.stripe.com/test_28EdR93CB93A7EJ0dt4sE04",
}

const PLANS = [
  {
    name: "Starter",
    price: "€49",
    period: "/maand",
    credits: "4 credits per maand",
    priceId: "price_1TCxrjFgp1PZQf1VtYsHjD8u",
    features: ["Toegang tot alle clubs", "Reserveren tot 48u van tevoren", "Maandelijks opzeggen"],
  },
  {
    name: "Popular",
    price: "€79",
    period: "/maand",
    credits: "10 credits per maand",
    priceId: "price_1TCxt3Fgp1PZQf1V4loQwqLk",
    features: ["Toegang tot alle clubs", "Reserveren tot 48u van tevoren", "Voorrangstoegang", "Community forum"],
    popular: true,
  },
  {
    name: "Pro",
    price: "€119",
    period: "/maand",
    credits: "14 credits per maand",
    priceId: "price_1TCxwwFgp1PZQf1VaiuY1KBl",
    features: ["Alle clubs incl. privébanen", "Prioriteit bij reserveren", "Gratis gastcredits", "20% korting op coaching"],
  },
]

const CREDIT_PACKS = [
  { amount: 1, label: "credit", price: "€19,99", per: "€19,99 per credit", priceId: "price_1TCyAlFgp1PZQf1VA8igAUtg" },
  { amount: 2, label: "credits", price: "€37,49", per: "€18,75 per credit", priceId: "price_1TCyFjFgp1PZQf1VOMgg3qJx" },
  { amount: 4, label: "credits", price: "€74,99", per: "€18,75 per credit", priceId: "price_1TCyBEFgp1PZQf1V2OlIDgoK", bestValue: true },
  { amount: 8, label: "credits", price: "€119,99", per: "€15,00 per credit", priceId: "price_1TCyBZFgp1PZQf1VMwmrEdRx" },
]

// price_id -> credits, for the one-time credit packs only (subscriptions
// renew monthly and need real webhook-driven top-ups, out of scope for now).
const CREDIT_AMOUNTS: Record<string, number> = Object.fromEntries(CREDIT_PACKS.map((p) => [p.priceId, p.amount]))

function BetalenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"abonnementen" | "credits">("abonnementen")

  const startCheckout = (priceId: string) => {
    const user = loadStoredUser()
    if (!user?.email) {
      router.push(`/login?redirect=/betalen&price=${priceId}`)
      return
    }

    const link = PAYMENT_LINKS[priceId]
    if (link) {
      const credits = CREDIT_AMOUNTS[priceId]
      if (credits) savePendingCreditPurchase(priceId, credits)
      window.location.href = `${link}?prefilled_email=${encodeURIComponent(user.email)}`
    }
  }

  useEffect(() => {
    const priceId = searchParams?.get("price")
    if (priceId) startCheckout(priceId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen pt-20 pb-16">
      <section className="section-padding">
        <div className="container-max px-4 md:px-6">
          <ScrollObserver delay={0}>
            <div className="text-center mb-10">
              <span className="text-xs text-lime font-medium tracking-wider uppercase">Sandbox</span>
              <h1 className="font-playfair text-4xl md:text-5xl font-bold mt-4 mb-4">Kies je plan</h1>
              <p className="text-text2 max-w-xl mx-auto font-light">
                Betaal veilig via Stripe. Geen verborgen kosten, maandelijks opzegbaar.
              </p>
            </div>
          </ScrollObserver>

          <div className="flex justify-center gap-2 mb-12">
            <button
              onClick={() => setTab("abonnementen")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                tab === "abonnementen" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"
              }`}
            >
              Abonnementen
            </button>
            <button
              onClick={() => setTab("credits")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                tab === "credits" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"
              }`}
            >
              Losse credits
            </button>
          </div>

          {tab === "abonnementen" ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <ScrollObserver key={plan.name} delay={0.05}>
                  <div
                    className={`relative border rounded-2xl p-6 transition-all h-full flex flex-col ${
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
                    <div className="mb-2">
                      <span className="font-playfair text-4xl font-bold text-text">{plan.price}</span>
                      <span className="text-text2 text-sm">{plan.period}</span>
                    </div>
                    <div className="text-lime font-bold mb-6">{plan.credits}</div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="text-sm text-text2 flex gap-2">
                          <span className="text-lime text-lg leading-none">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => startCheckout(plan.priceId)}
                      className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                        plan.popular
                          ? "bg-lime text-dark hover:opacity-90"
                          : "border border-muted text-text2 hover:text-text hover:border-text"
                      }`}
                    >
                      Kies plan
                    </button>
                  </div>
                </ScrollObserver>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {CREDIT_PACKS.map((pack) => (
                <ScrollObserver key={pack.amount} delay={0.05}>
                  <div
                    className={`relative border rounded-2xl p-5 text-center h-full flex flex-col ${
                      pack.bestValue ? "border-lime/50 bg-surface2 ring-1 ring-lime/20" : "border-border"
                    }`}
                  >
                    {pack.bestValue && (
                      <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-lime text-dark px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                        Beste waarde
                      </span>
                    )}
                    <div className="font-playfair text-3xl font-bold text-text mt-2">{pack.amount}</div>
                    <div className="text-xs text-text3 uppercase tracking-wider mb-3">{pack.label}</div>
                    <div className="text-lime font-bold text-lg mb-1">{pack.price}</div>
                    <div className="text-text3 text-xs mb-5">{pack.per}</div>
                    <button
                      onClick={() => startCheckout(pack.priceId)}
                      className="mt-auto w-full py-2.5 rounded-lg font-bold text-sm border border-muted text-text2 hover:text-text hover:border-text transition-all"
                    >
                      Kopen
                    </button>
                  </div>
                </ScrollObserver>
              ))}
            </div>
          )}

          <p className="text-center text-text3 text-xs mt-10">
            Je wordt doorgestuurd naar Stripe om de betaling af te ronden (sandbox-omgeving).
          </p>
        </div>
      </section>
    </main>
  )
}

export default function BetalenPage() {
  return (
    <Suspense fallback={null}>
      <BetalenContent />
    </Suspense>
  )
}
