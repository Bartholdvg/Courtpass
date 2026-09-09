"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MobileMenu from "./MobileMenu"
import LanguageToggle from "./LanguageToggle"
import Icon from "./Icon"
import { AUTH_CHANGED_EVENT, CLUBS_NAV_RESET_EVENT, clearStoredUser, getUserDisplayName, loadStoredUser, signOut, type CourtPassUser } from "@/lib/supabase"
import { fetchManagedClubs, fetchMyProfile } from "@/lib/booking"
import { useLanguage } from "@/lib/i18n"

export default function Navigation() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [user, setUser] = useState<CourtPassUser | null>(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const contactRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    setIsMounted(true)
    const syncUser = () => setUser(loadStoredUser())
    syncUser()
    window.addEventListener("storage", syncUser)
    window.addEventListener(AUTH_CHANGED_EVENT, syncUser)
    return () => {
      window.removeEventListener("storage", syncUser)
      window.removeEventListener(AUTH_CHANGED_EVENT, syncUser)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setHasAdminAccess(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const profile = await fetchMyProfile()
        if (!profile) return
        const access = profile.isPlatformAdmin || (await fetchManagedClubs(profile.id, false)).length > 0
        if (!cancelled) setHasAdminAccess(access)
      } catch {
        if (!cancelled) setHasAdminAccess(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false)
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setIsContactOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false)
        setIsProfileOpen(false)
        setIsContactOpen(false)
      }
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

  const handleLogout = () => {
    signOut().catch(() => undefined)
    clearStoredUser()
    setUser(null)
    setIsMenuOpen(false)
    setIsProfileOpen(false)
    router.push("/")
  }

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
            <a href="/#hoe-het-werkt" className="text-text2 hover:text-text transition-colors text-sm">
              {t("nav.howItWorks")}
            </a>
          </li>
          <li>
            <Link
              href="/clubs"
              onClick={() => window.dispatchEvent(new Event(CLUBS_NAV_RESET_EVENT))}
              className="flex items-center gap-1.5 text-text2 hover:text-text transition-colors text-sm"
            >
              <Icon name="tennis" className="text-lime" />
              {t("nav.clubs")}
            </Link>
          </li>
          <li>
            <a href="/#abonnementen" className="text-text2 hover:text-text transition-colors text-sm">
              {t("nav.subscriptions")}
            </a>
          </li>
          <li>
            <Link href="/aansluiten" className="text-text2 hover:text-text transition-colors text-sm">
              Sluit je club aan
            </Link>
          </li>
          <li className="relative" ref={contactRef}>
            <button
              onClick={() => setIsContactOpen((v) => !v)}
              aria-expanded={isContactOpen}
              className="flex items-center gap-1 text-text2 hover:text-text transition-colors text-sm"
            >
              {t("nav.contact")}
              <span className={`text-[10px] transition-transform ${isContactOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {isContactOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-border bg-surface2 shadow-2xl overflow-hidden py-1.5 z-50">
                <a
                  href="/#contact"
                  onClick={() => setIsContactOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                >
                  {t("nav.contact")}
                </a>
                <Link
                  href="/faq"
                  onClick={() => setIsContactOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  href="/voorwaarden"
                  onClick={() => setIsContactOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                >
                  Voorwaarden
                </Link>
                <Link
                  href="/privacy"
                  onClick={() => setIsContactOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                >
                  Privacy
                </Link>
              </div>
            )}
          </li>
          <li>
            <LanguageToggle />
          </li>
          <li className="flex gap-3 items-center ml-3">
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen((v) => !v)}
                  aria-expanded={isProfileOpen}
                  className="border border-lime/40 text-lime px-4 py-2 rounded-full transition-all text-sm flex items-center gap-2"
                >
                  <span className="w-6 h-6 rounded-full bg-lime/15 flex items-center justify-center text-[11px] font-bold">
                    {getUserDisplayName(user).slice(0, 2).toUpperCase()}
                  </span>
                  <span>{getUserDisplayName(user)}</span>
                  <span className={`text-[10px] transition-transform ${isProfileOpen ? "rotate-180" : ""}`}>▾</span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-surface2 shadow-2xl overflow-hidden py-1.5 z-50">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                    >
                      {t("nav.dashboard")}
                    </Link>
                    <Link
                      href="/dashboard#mijn-gegevens"
                      onClick={() => setIsProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                    >
                      {t("nav.myDetails")}
                    </Link>
                    <Link
                      href="/dashboard#eerdere-boekingen"
                      onClick={() => setIsProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                    >
                      {t("nav.previousBookings")}
                    </Link>
                    {hasAdminAccess && (
                      <Link
                        href="/club-admin"
                        onClick={() => setIsProfileOpen(false)}
                        className="block px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                      >
                        {t("nav.admin")}
                      </Link>
                    )}
                    <div className="h-px bg-border/50 my-1.5" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-surface transition-colors"
                    >
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="border border-muted text-text2 hover:text-text hover:border-text px-4 py-2 rounded-full transition-all text-sm">
                  {t("nav.login")}
                </Link>
                <Link href="/login?tab=register" className="bg-lime text-dark px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity text-sm">
                  {t("nav.tryFree")}
                </Link>
              </>
            )}
          </li>
        </ul>

        {/* Hamburger Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-1.5 relative z-[1001]"
          aria-label="Menu toggle"
          aria-expanded={isMenuOpen}
        >
          <span className={`w-5 h-0.5 bg-text2 rounded transition-all duration-300 ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`w-5 h-0.5 bg-text2 rounded transition-all duration-300 ${isMenuOpen ? "opacity-0 scale-x-0" : ""}`} />
          <span className={`w-5 h-0.5 bg-text2 rounded transition-all duration-300 ${isMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <MobileMenu user={user} hasAdminAccess={hasAdminAccess} onClose={() => setIsMenuOpen(false)} onLogout={handleLogout} />
      )}

      {/* Overlay — must stack BELOW the menu (z-40) or it swallows every tap on
          the menu itself, since equal z-index falls back to DOM order and this
          renders after MobileMenu. */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setIsMenuOpen(false)} />
      )}
    </>
  )
}
