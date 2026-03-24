"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [tab, setTab] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with Supabase
    console.log({
      tab,
      email,
      password,
      ...(tab === "register" && { fullName }),
    })
  }

  return (
    <main className="min-h-screen pt-20 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border border-border rounded-2xl p-8 bg-surface/50"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-playfair text-3xl font-bold mb-2">
              {tab === "login" ? "Welkom terug" : "Maak account"}
            </h1>
            <p className="text-text2 text-sm">
              {tab === "login" ? "Inloggen op jouw CourtPass account" : "Registreer je en begin vandaag nog"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-border pb-4">
            <button
              onClick={() => setTab("login")}
              className={`pb-2 text-sm font-bold transition-colors ${
                tab === "login" ? "text-lime border-b-2 border-lime" : "text-text2 hover:text-text"
              }`}
            >
              Inloggen
            </button>
            <button
              onClick={() => setTab("register")}
              className={`pb-2 text-sm font-bold transition-colors ${
                tab === "register" ? "text-lime border-b-2 border-lime" : "text-text2 hover:text-text"
              }`}
            >
              Registreren
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-sm text-text2 mb-2">Volledige naam</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                  placeholder="Jan de Vries"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-text2 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                placeholder="jouw@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-text2 mb-2">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-lime transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-lime text-dark py-3 rounded-lg font-bold hover:opacity-90 transition-opacity mt-6"
            >
              {tab === "login" ? "Inloggen" : "Account aanmaken"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-text3">
            {tab === "login" ? (
              <>
                Nog geen account?{" "}
                <button onClick={() => setTab("register")} className="text-lime hover:underline font-bold">
                  Registreren
                </button>
              </>
            ) : (
              <>
                Al account?{" "}
                <button onClick={() => setTab("login")} className="text-lime hover:underline font-bold">
                  Inloggen
                </button>
              </>
            )}
          </div>

          <Link href="/" className="block text-center text-sm text-text2 hover:text-text mt-6">
            Terug naar home
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
