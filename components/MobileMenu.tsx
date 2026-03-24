"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useEffect } from "react"

interface MobileMenuProps {
  onClose: () => void
}

export default function MobileMenu({ onClose }: MobileMenuProps) {
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
      {/* Menu Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-border">
        <span className="font-medium text-text text-sm">Menu</span>
        <button
          onClick={onClose}
          className="text-text2 hover:text-text text-lg w-6 h-6 flex items-center justify-center"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        {[
          { href: "#hoe-het-werkt", label: "Hoe het werkt" },
          { href: "/clubs", label: "🎾 Clubs" },
          { href: "#abonnementen", label: "Abonnementen" },
          { href: "#contact", label: "Contact" },
        ].map((item, i) => (
          <motion.a
            key={item.href}
            href={item.href}
            custom={i}
            variants={menuItemVariants}
            initial="hidden"
            animate="visible"
            className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm border-b border-border/30 last:border-b-0"
          >
            {item.label}
          </motion.a>
        ))}

        {/* Divider */}
        <div className="h-px bg-border/30 my-2" />

        {/* Auth Links */}
        <motion.a
          href="/login"
          custom={4}
          variants={menuItemVariants}
          initial="hidden"
          animate="visible"
          className="block px-5 py-3 text-text2 hover:text-text hover:bg-surface transition-colors text-sm"
        >
          Inloggen
        </motion.a>

        <motion.div
          custom={5}
          variants={menuItemVariants}
          initial="hidden"
          animate="visible"
          className="px-3 py-2"
        >
          <Link
            href="/login?tab=register"
            className="block w-full bg-lime text-dark text-center py-3 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
          >
            Probeer gratis →
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
