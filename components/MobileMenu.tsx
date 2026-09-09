"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useEffect } from "react"
import { CLUBS_NAV_RESET_EVENT, getUserDisplayName, type CourtPassUser } from "@/lib/supabase"
import { useLanguage } from "@/lib/i18n"
import LanguageToggle from "./LanguageToggle"

interface MobileMenuProps {
  user: CourtPassUser | null
  hasAdminAccess?: boolean
  onClose: () => void
  onLogout: () => void
}

export default function MobileMenu({ user, hasAdminAccess, onClose, onLogout }: MobileMenuProps) {
  const { t } = useLanguage()
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("a")) {
        onClose()
      }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [onClose])

  const menuItemVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  }

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-16 right-3 sm:right-4 w-[90vw] sm:w-64 bg-surface2 border border-border rounded-2xl shadow-2xl z-40 md:hidden"
    >
      <div className="flex justify-between items-center px-5 py-4 border-b border-border">
        <span className="font-medium text-text text-sm">{t("nav.menu")}</span>
        <button onClick={onClose} className="text-text2 hover:text-text text-lg w-6 h-6 flex items-center justify-center" aria-label="Close menu">
          ✕
        </button>
      </div>

      <div className="flex justify-center px-5 py-3 border-b border-border/30">
        <LanguageToggle />
      </div>

      <div className="py-2">
        {[
          { href: "/#hoe-het-werkt", label: t("nav.howItWorks") },
          { href: "/clubs", label: t("nav.clubs") },
          { href: "/#abonnementen", label: t("nav.subscriptions") },
          { href: "/#contact", label: t("nav.contact") },
        ].map((item, i) => (
          <motion.div key={item.href} custom={i} variants={menuItemVariants} initial="hidden" animate="visible">
            <Link
              href={item.href}
              className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm border-b border-border/30 last:border-b-0"
              onClick={() => {
                if (item.href === "/clubs") window.dispatchEvent(new Event(CLUBS_NAV_RESET_EVENT))
                onClose()
              }}
            >
              {item.label}
            </Link>
          </motion.div>
        ))}

        <div className="h-px bg-border/30 my-2" />

        {user ? (
          <>
            <motion.div custom={4} variants={menuItemVariants} initial="hidden" animate="visible">
              <Link href="/dashboard" className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm" onClick={onClose}>
                Dashboard · {getUserDisplayName(user)}
              </Link>
            </motion.div>
            <motion.div custom={4.25} variants={menuItemVariants} initial="hidden" animate="visible">
              <Link href="/dashboard#mijn-gegevens" className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm" onClick={onClose}>
                {t("nav.myDetails")}
              </Link>
            </motion.div>
            <motion.div custom={4.4} variants={menuItemVariants} initial="hidden" animate="visible">
              <Link href="/dashboard#eerdere-boekingen" className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm" onClick={onClose}>
                {t("nav.previousBookings")}
              </Link>
            </motion.div>
            {hasAdminAccess && (
              <motion.div custom={4.5} variants={menuItemVariants} initial="hidden" animate="visible">
                <Link href="/club-admin" className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm border-b border-border/30" onClick={onClose}>
                  {t("nav.admin")}
                </Link>
              </motion.div>
            )}
            <motion.div custom={5} variants={menuItemVariants} initial="hidden" animate="visible" className="px-3 py-2">
              <button onClick={onLogout} className="block w-full border border-border text-text2 py-3 rounded-xl text-sm">
                {t("nav.logout")}
              </button>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div custom={4} variants={menuItemVariants} initial="hidden" animate="visible">
              <Link href="/login" className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm" onClick={onClose}>
                {t("nav.login")}
              </Link>
            </motion.div>
            <motion.div custom={5} variants={menuItemVariants} initial="hidden" animate="visible" className="px-3 py-2">
              <Link href="/login?tab=register" className="block w-full bg-lime text-dark text-center py-3 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm" onClick={onClose}>
                {t("nav.tryFree")} →
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}
