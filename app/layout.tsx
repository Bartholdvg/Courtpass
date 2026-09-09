import type { Metadata, Viewport } from "next"
import { Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"
import { LanguageProvider } from "@/lib/i18n"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["700", "900"],
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  title: "CourtPass — Tennis zonder binding",
  description: "Eén abonnement. Meerdere clubs. Speel wanneer en waar jij wilt — zonder vast lidmaatschap.",
}

// Without this, mobile Safari has no viewport meta tag to go on and falls
// back to its legacy ~980px virtual viewport, rendering the whole site
// zoomed out to fit — exactly the "looks like a shrunk desktop site on
// iPhone" behavior reported.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="bg-dark text-text font-dm-sans font-normal leading-relaxed overflow-x-hidden">
        <LanguageProvider>
          <Navigation />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
