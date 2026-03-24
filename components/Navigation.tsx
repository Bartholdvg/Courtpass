"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import MobileMenu from "./MobileMenu"

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false)
    }

    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isMenuOpen])

  if (!isMounted) return null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center nav-padding bg-dark/88 backdrop-blur-xl border-b border-border/80">
        <Link href="/" className="font-playfair font-bold text-xl tracking-tight">
          Court<span className="text-lime">Pass</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex gap-6 list-none items-center">
          <li>
            <a href="#hoe-het-werkt" className="text-text2 hover:text-text transition-colors text-sm">
              Hoe het werkt
            </a>
          </li>
          <li>
            <Link href="/clubs" className="text-text2 hover:text-text transition-colors text-sm">
              🎾 Clubs
            </Link>
          </li>
          <li>
            <a href="#abonnementen" className="text-text2 hover:text-text transition-colors text-sm">
              Abonnementen
            </a>
          </li>
          <li>
            <a href="#contact" className="text-text2 hover:text-text transition-colors text-sm">
              Contact
            </a>
          </li>
          <li className="flex gap-3 items-center ml-3">
            <Link
              href="/login"
              className="border border-muted text-text2 hover:text-text hover:border-text px-4 py-2 rounded-full transition-all text-sm"
            >
              Inloggen
            </Link>
            <Link
              href="/login?tab=register"
              className="bg-lime text-dark px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity text-sm"
            >
              Probeer gratis
            </Link>
          </li>
        </ul>

        {/* Hamburger Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-1.5 relative z-[1001]"
          aria-label="Menu toggle"
          aria-expanded={isMenuOpen}
        >
          <span
            className={`w-5 h-0.5 bg-text2 rounded transition-all duration-300 ${
              isMenuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-text2 rounded transition-all duration-300 ${
              isMenuOpen ? "opacity-0 scale-x-0" : ""
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-text2 rounded transition-all duration-300 ${
              isMenuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && <MobileMenu onClose={() => setIsMenuOpen(false)} />}

      {/* Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}
