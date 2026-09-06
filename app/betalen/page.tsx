"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ScrollObserver from "@/components/ScrollObserver"
import { getCurrentUser, loadStoredUser } from "@/lib/supabase"
import { adjustMyCredits, savePendingCreditPurchase } from "@/lib/booking"
import {
  cancelMySubscription,
  effectivePriceCents,
  fetchActiveCreditPacks,
  fetchActiveSubscriptionPlans,
  fetchMySubscription,
  formatEuros,
  savePendingSubscriptionPurchase,
  subscribeToPlan,
  type CreditPack,
  type SubscriptionPlan,
  type UserSubscription,
} from "@/lib/billing"

const SANDBOX_TOPUPS = [100, 500, 3000]

function BetalenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"abonnementen" | "credits">(
    searchParams?.get("tab") === "credits" ? "credits" : "abonnementen",
  )
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [mySubscription, setMySubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [planLoading, setPlanLoading] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [topupLoading, setTopupLoading] = useState<number | null>(null)
  const [topupMessage, setTopupMessage] = useState("")
  const [topupError, setTopupError] = useState("")

  async function load() {
    try {
      const [plansData, packsData] = await Promise.all([fetchActiveSubscriptionPlans(), fetchActiveCreditPacks()])
      setPlans(plansData)
      setPacks(packsData)
    } catch (err: any) {
      setActionError(err.message || "Kon abonnementen/credits niet laden.")
    }
    const user = await getCurrentUser().catch(() => null)
    if (user) {
      fetchMySubscription()
        .then(setMySubscription)
        .catch(() => setMySubscription(null))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSandboxTopup = async (amount: number) => {
    const user = await getCurrentUser()
    if (!user) {
      router.push(`/login?redirect=/betalen&tab=credits`)
      return
    }

    setTopupLoading(amount)
    setTopupError("")
    setTopupMessage("")
    try {
      const newBalance = await adjustMyCredits(amount, "topup", "Sandbox-snelkoppeling (geen echte betaling)")
      setTopupMessage(`+${amount} credits toegevoegd. Nieuw saldo: ${Math.round(newBalance)} credits.`)
    } catch (err: any) {
      setTopupError(err.message || "Kon geen credits toevoegen.")
    } finally {
      setTopupLoading(null)
    }
  }

  async function startPackCheckout(pack: CreditPack) {
    const user = loadStoredUser()
    if (!user?.email) {
      router.push(`/login?redirect=/betalen&packId=${pack.id}`)
      return
    }
    if (!pack.paymentLink) {
      setActionError(`"${pack.name}" is nog niet te koop — er is nog geen betaallink ingesteld.`)
      return
    }
    savePendingCreditPurchase(pack.id, pack.credits)
    window.location.href = `${pack.paymentLink}?prefilled_email=${encodeURIComponent(user.email)}`
  }

  async function startPlanCheckout(plan: SubscriptionPlan) {
    setActionError("")
    setActionMessage("")
    const user = await getCurrentUser()
    if (!user) {
      router.push(`/login?redirect=/betalen&planId=${plan.id}`)
      return
    }

    const price = effectivePriceCents(plan)
    if (price === 0) {
      setPlanLoading(plan.id)
      try {
        await subscribeToPlan(plan.id, false)
        setMySubscription(await fetchMySubscription())
        setActionMessage(`Je bent overgestapt naar ${plan.name}.`)
      } catch (err: any) {
        setActionError(err.message || "Kon niet overstappen naar dit plan.")
      } finally {
        setPlanLoading(null)
      }
      return
    }

    if (!plan.paymentLink) {
      setActionError(`"${plan.name}" is nog niet af te sluiten — er is nog geen betaallink ingesteld.`)
      return
    }
    const storedUser = loadStoredUser()
    savePendingSubscriptionPurchase(plan.id, false)
    window.location.href = `${plan.paymentLink}?prefilled_email=${encodeURIComponent(storedUser?.email || user.email || "")}`
  }

  async function handleCancelSubscription() {
    if (!confirm("Abonnement opzeggen? Al toegekende credits blijven bruikbaar tot ze verlopen.")) return
    setCancelLoading(true)
    try {
      await cancelMySubscription()
      setMySubscription(await fetchMySubscription())
      setActionMessage("Abonnement opgezegd.")
    } catch (err: any) {
      setActionError(err.message || "Opzeggen mislukt.")
    } finally {
      setCancelLoading(false)
    }
  }

  useEffect(() => {
    if (loading) return
    const packId = searchParams?.get("packId")
    const planId = searchParams?.get("planId")
    if (packId) {
      const pack = packs.find((p) => p.id === packId)
      if (pack) startPackCheckout(pack)
    } else if (planId) {
      const plan = plans.find((p) => p.id === planId)
      if (plan) startPlanCheckout(plan)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

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

          <div className="flex justify-center gap-2 mb-8">
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

          {actionMessage && (
            <p className="max-w-xl mx-auto text-center text-sm text-lime mb-4 rounded-lg border border-lime/20 bg-lime/10 p-3">
              {actionMessage}
            </p>
          )}
          {actionError && (
            <p className="max-w-xl mx-auto text-center text-sm text-red-400 mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              {actionError}
            </p>
          )}

          {loading ? (
            <p className="text-center text-text2 text-sm">Laden…</p>
          ) : tab === "abonnementen" ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
              {plans.map((plan) => {
                const price = effectivePriceCents(plan)
                const onSale = price < plan.priceCents
                const isCurrent = mySubscription?.planId === plan.id
                return (
                  <ScrollObserver key={plan.id} delay={0.05}>
                    <div
                      className={`relative border rounded-2xl p-6 transition-all h-full flex flex-col ${
                        plan.mostChosen
                          ? "border-lime/50 bg-surface2 ring-1 ring-lime/20 transform md:scale-105"
                          : isCurrent
                            ? "border-lime/40"
                            : "border-border hover:border-muted"
                      }`}
                    >
                      {plan.mostChosen && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-lime text-dark px-3 py-1 rounded-full text-xs font-bold uppercase">
                          POPULAIR
                        </div>
                      )}
                      <h3 className="text-xs text-text3 uppercase tracking-widest font-bold mb-4">{plan.name}</h3>
                      <div className="mb-1">
                        {onSale && <span className="text-text3 line-through text-sm mr-2">{formatEuros(plan.priceCents)}</span>}
                        <span className="font-playfair text-3xl font-bold text-text">{price === 0 ? "Gratis" : formatEuros(price)}</span>
                        {price > 0 && <span className="text-text2 text-sm">/maand</span>}
                      </div>
                      <div className="text-lime font-bold mb-6 text-sm">
                        {plan.creditsPerMonth > 0 ? `${plan.creditsPerMonth} credits per maand` : "Geen maandelijkse credits"}
                      </div>
                      <div className="flex-1" />
                      {isCurrent ? (
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelLoading}
                          className="w-full py-3 rounded-lg font-bold text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {cancelLoading ? "Bezig…" : "Huidig plan · opzeggen"}
                        </button>
                      ) : (
                        <button
                          onClick={() => startPlanCheckout(plan)}
                          disabled={planLoading === plan.id}
                          className={`w-full py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
                            plan.mostChosen
                              ? "bg-lime text-dark hover:opacity-90"
                              : "border border-muted text-text2 hover:text-text hover:border-text"
                          }`}
                        >
                          {planLoading === plan.id ? "Bezig…" : "Kies plan"}
                        </button>
                      )}
                    </div>
                  </ScrollObserver>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {packs.map((pack) => {
                const price = effectivePriceCents(pack)
                const onSale = price < pack.priceCents
                const perCredit = price / 100 / pack.credits
                return (
                  <ScrollObserver key={pack.id} delay={0.05}>
                    <div className="relative border rounded-2xl p-5 text-center h-full flex flex-col border-border">
                      <div className="font-playfair text-3xl font-bold text-text mt-2">{pack.credits}</div>
                      <div className="text-xs text-text3 uppercase tracking-wider mb-3">credits</div>
                      {onSale && <div className="text-text3 line-through text-xs">{formatEuros(pack.priceCents)}</div>}
                      <div className="text-lime font-bold text-lg mb-1">{formatEuros(price)}</div>
                      <div className="text-text3 text-xs mb-5">€{perCredit.toFixed(2).replace(".", ",")} per credit</div>
                      <button
                        onClick={() => startPackCheckout(pack)}
                        className="mt-auto w-full py-2.5 rounded-lg font-bold text-sm border border-muted text-text2 hover:text-text hover:border-text transition-all"
                      >
                        Kopen
                      </button>
                    </div>
                  </ScrollObserver>
                )
              })}
            </div>
          )}

          {tab === "credits" && (
            <ScrollObserver delay={0.1}>
              <div className="max-w-md mx-auto mt-10 rounded-2xl border border-lime/20 bg-lime/5 p-5">
                <p className="text-xs uppercase tracking-wider text-lime font-bold mb-1">Sandbox-snelkoppeling</p>
                <p className="text-text2 text-sm mb-4">
                  Geen zin om een testbetaling via Stripe af te ronden? Voeg dummy credits direct toe aan je
                  account — er wordt niets echt betaald, dit is puur voor testen.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SANDBOX_TOPUPS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleSandboxTopup(amount)}
                      disabled={topupLoading !== null}
                      className="flex-1 min-w-[90px] py-2.5 rounded-lg font-bold text-sm border border-lime/40 text-lime hover:bg-lime/10 transition-colors disabled:opacity-50"
                    >
                      {topupLoading === amount ? "Bezig…" : `+${amount}`}
                    </button>
                  ))}
                </div>
                {topupMessage && <p className="text-sm text-lime mt-3">{topupMessage}</p>}
                {topupError && <p className="text-sm text-red-400 mt-3">{topupError}</p>}
              </div>
            </ScrollObserver>
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
