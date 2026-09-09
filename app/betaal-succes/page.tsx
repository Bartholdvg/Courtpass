"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import Icon from "@/components/Icon"
import { adjustMyCredits, consumePendingCreditPurchase } from "@/lib/booking"
import { consumePendingSubscriptionPurchase, subscribeToPlan } from "@/lib/billing"

export default function BetaaldPage() {
  const [status, setStatus] = useState<"working" | "credited" | "subscribed" | "plain" | "error">("working")
  const [creditsAdded, setCreditsAdded] = useState(0)

  useEffect(() => {
    const credits = consumePendingCreditPurchase()
    if (credits) {
      adjustMyCredits(credits, "topup", "Credits gekocht via Stripe (sandbox)")
        .then(() => {
          setCreditsAdded(credits)
          setStatus("credited")
        })
        .catch(() => setStatus("error"))
      return
    }

    const pendingSubscription = consumePendingSubscriptionPurchase()
    if (pendingSubscription) {
      subscribeToPlan(pendingSubscription.planId, pendingSubscription.isAnnual)
        .then(() => setStatus("subscribed"))
        .catch(() => setStatus("error"))
      return
    }

    setStatus("plain")
  }, [])

  return (
    <main className="min-h-screen pt-20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-full bg-lime/10 flex items-center justify-center mx-auto mb-6">
          <Icon name="check-circle" size={40} className="text-lime" />
        </div>
        <h1 className="font-playfair text-4xl font-bold mb-2">Betaling gelukt!</h1>
        {status === "credited" ? (
          <p className="text-text2 mb-2 max-w-md mx-auto">
            <span className="text-lime font-bold">+{creditsAdded} credits</span> zijn aan je account toegevoegd.
          </p>
        ) : status === "subscribed" ? (
          <p className="text-text2 mb-2 max-w-md mx-auto">Je abonnement is geactiveerd en de eerste credits staan al op je account.</p>
        ) : status === "error" ? (
          <p className="text-red-400 mb-2 max-w-md mx-auto">Bedankt voor je betaling — dit kon niet automatisch worden verwerkt.</p>
        ) : (
          <p className="text-text2 mb-2 max-w-md mx-auto">Bedankt voor je betaling. Je account is geactiveerd en je kunt nu gaan spelen!</p>
        )}
        <p className="text-text3 text-xs mb-8 max-w-sm mx-auto">(Sandbox-omgeving — dit is een testbetaling, er is niets echt afgeschreven.)</p>
        <Link
          href="/dashboard"
          className="inline-block bg-lime text-dark px-8 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
        >
          Naar dashboard
        </Link>
      </motion.div>
    </main>
  )
}
