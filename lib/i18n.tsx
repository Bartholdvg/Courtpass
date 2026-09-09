"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type Language = "nl" | "en"

const STORAGE_KEY = "courtpass-lang"

/** Deliberately scoped to the pages a visitor sees most (nav, the
 * marketing homepage) rather than the whole app — dashboard/booking/
 * club-admin stay Dutch-only for now and simply ignore `lang`, which is
 * a smaller and more honest step than a toggle that half-translates
 * every screen. */
const dict = {
  nl: {
    nav: {
      howItWorks: "Hoe het werkt",
      clubs: "Clubs",
      subscriptions: "Abonnementen",
      contact: "Contact",
      login: "Inloggen",
      tryFree: "Probeer gratis",
      dashboard: "Dashboard",
      myDetails: "Mijn gegevens",
      previousBookings: "Eerdere boekingen",
      admin: "Admin",
      logout: "Uitloggen",
      menu: "Menu",
    },
    home: {
      badge: "NU BESCHIKBAAR IN AMSTERDAM",
      heroLine1: "Tennis op jouw",
      heroEm: "tempo.",
      heroLine3: "Zonder binding.",
      heroSubtitle: "Eén abonnement. Meerdere clubs. Speel wanneer en waar jij wilt — zonder vast lidmaatschap.",
      ctaStart: "Start voor €49/maand",
      ctaViewClubs: "Bekijk clubs →",
      howItWorksLink: "Hoe het werkt ↓",
      socialProof: "Al 200+ spelers gingen je voor",
      cardTitle: "CourtPass — Tennis zonder binding",
      cardBadge: "Flexibel",
      cardDesc: "Reserveer eenvoudig bij meerdere clubs, betaal met credits en speel wanneer het jou uitkomt.",
      statClubs: "Clubs",
      statAhead: "Vooruit",
      statCredits: "Credits",
      howEyebrow: "STAP VOOR STAP",
      howTitle: "Hoe CourtPass werkt",
      howSubtitle: "Van inschrijven tot je eerste wedstrijd in vier simpele stappen.",
      step1Title: "Account aanmaken",
      step1Desc: "Registreer met je e-mailadres en kies je abonnement.",
      step2Title: "Clubs ontdekken",
      step2Desc: "Bekijk alle beschikbare clubs in jouw buurt.",
      step3Title: "Baan reserveren",
      step3Desc: "Reserveer je baantijd voor wanneer jij wilt.",
      step4Title: "Spelen!",
      step4Desc: "Show up en geniet van tennis zonder binding.",
      pricingEyebrow: "KIES JE PLAN",
      pricingTitle: "Transparante prijzen",
      pricingSubtitle: "Geen verborgen kosten. Geen contracts. Zeg op elk moment op.",
      loading: "Laden…",
      popular: "POPULAIR",
      free: "Gratis",
      perMonth: "/maand",
      creditsPerMonth: "credits per maand",
      noMonthlyCredits: "Geen maandelijkse credits",
      choosePlan: "Kies plan",
      ctaBannerTitle: "Klaar om zonder binding te spelen?",
      ctaBannerButton: "Start gratis proefperiode",
      contactTitle: "Contact opnemen",
      contactSubtitle: "Vragen? Laat het ons weten.",
      formName: "Naam",
      formNamePlaceholder: "Jouw naam",
      formEmail: "Email",
      formMessage: "Bericht",
      formMessagePlaceholder: "Jouw bericht...",
      formSubmit: "Verstuur bericht",
      footerTagline: "Tennis zonder binding.",
      footerProduct: "Product",
      footerHowItWorks: "Hoe het werkt",
      footerPricing: "Prijzen",
      footerClubs: "Clubs",
      footerJoinClub: "Sluit je club aan",
      footerSupport: "Support",
      footerContact: "Contact",
      footerFaq: "FAQ",
      footerLegal: "Legal",
      footerPrivacy: "Privacy",
      footerTerms: "Voorwaarden",
      footerRights: "© 2024 CourtPass. Alle rechten voorbehouden.",
      footerMadeWith: "Made with ❤️ for tennis players",
    },
  },
  en: {
    nav: {
      howItWorks: "How it works",
      clubs: "Clubs",
      subscriptions: "Plans",
      contact: "Contact",
      login: "Log in",
      tryFree: "Try for free",
      dashboard: "Dashboard",
      myDetails: "My details",
      previousBookings: "Past bookings",
      admin: "Admin",
      logout: "Log out",
      menu: "Menu",
    },
    home: {
      badge: "NOW AVAILABLE IN AMSTERDAM",
      heroLine1: "Tennis on your",
      heroEm: "own time.",
      heroLine3: "No membership.",
      heroSubtitle: "One subscription. Multiple clubs. Play whenever and wherever you want — no fixed membership.",
      ctaStart: "Start from €49/month",
      ctaViewClubs: "View clubs →",
      howItWorksLink: "How it works ↓",
      socialProof: "200+ players already joined",
      cardTitle: "CourtPass — Tennis without commitment",
      cardBadge: "Flexible",
      cardDesc: "Book courts at multiple clubs, pay with credits, and play whenever it suits you.",
      statClubs: "Clubs",
      statAhead: "Ahead",
      statCredits: "Credits",
      howEyebrow: "STEP BY STEP",
      howTitle: "How CourtPass works",
      howSubtitle: "From signing up to your first match in four simple steps.",
      step1Title: "Create an account",
      step1Desc: "Sign up with your email and choose your plan.",
      step2Title: "Discover clubs",
      step2Desc: "Browse all the clubs available near you.",
      step3Title: "Book a court",
      step3Desc: "Reserve your court time whenever suits you.",
      step4Title: "Play!",
      step4Desc: "Show up and enjoy tennis without commitment.",
      pricingEyebrow: "CHOOSE YOUR PLAN",
      pricingTitle: "Transparent pricing",
      pricingSubtitle: "No hidden fees. No contracts. Cancel anytime.",
      loading: "Loading…",
      popular: "POPULAR",
      free: "Free",
      perMonth: "/month",
      creditsPerMonth: "credits per month",
      noMonthlyCredits: "No monthly credits",
      choosePlan: "Choose plan",
      ctaBannerTitle: "Ready to play without commitment?",
      ctaBannerButton: "Start free trial",
      contactTitle: "Get in touch",
      contactSubtitle: "Questions? Let us know.",
      formName: "Name",
      formNamePlaceholder: "Your name",
      formEmail: "Email",
      formMessage: "Message",
      formMessagePlaceholder: "Your message...",
      formSubmit: "Send message",
      footerTagline: "Tennis without commitment.",
      footerProduct: "Product",
      footerHowItWorks: "How it works",
      footerPricing: "Pricing",
      footerClubs: "Clubs",
      footerJoinClub: "Join as a club",
      footerSupport: "Support",
      footerContact: "Contact",
      footerFaq: "FAQ",
      footerLegal: "Legal",
      footerPrivacy: "Privacy",
      footerTerms: "Terms",
      footerRights: "© 2024 CourtPass. All rights reserved.",
      footerMadeWith: "Made with ❤️ for tennis players",
    },
  },
} as const

function getByPath(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj)
}

interface LanguageContextValue {
  lang: Language
  setLang: (l: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "nl",
  setLang: () => {},
  t: (key: string) => getByPath(dict.nl, key) ?? key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("nl")

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "en" || stored === "nl") setLangState(stored)
    } catch {
      // localStorage can throw in a private window — just stay on the default
    }
  }, [])

  function setLang(l: Language) {
    setLangState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // best-effort — the toggle still works for the rest of this session
    }
  }

  function t(key: string): string {
    return getByPath(dict[lang], key) ?? getByPath(dict.nl, key) ?? key
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext)
}
