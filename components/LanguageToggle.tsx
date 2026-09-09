"use client"

import { useLanguage } from "@/lib/i18n"

export default function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  return (
    <div className={`inline-flex items-center rounded-full border border-border p-0.5 text-xs font-bold ${className || ""}`}>
      <button
        onClick={() => setLang("nl")}
        className={`px-2.5 py-1 rounded-full transition-colors ${lang === "nl" ? "bg-lime text-dark" : "text-text2 hover:text-text"}`}
      >
        NL
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-full transition-colors ${lang === "en" ? "bg-lime text-dark" : "text-text2 hover:text-text"}`}
      >
        EN
      </button>
    </div>
  )
}
