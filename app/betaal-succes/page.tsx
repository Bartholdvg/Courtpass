"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function BetaaldPage() {
  return (
    <main className="min-h-screen pt-20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="text-6xl mb-6">✅</div>
        <h1 className="font-playfair text-4xl font-bold mb-2">Betaling gelukt!</h1>
        <p className="text-text2 mb-8 max-w-md mx-auto">
          Bedankt voor je betaling. Je account is geactiveerd en je kunt nu gaan spelen!
        </p>
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
