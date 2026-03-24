import type { Metadata } from "next"
import { Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="bg-dark text-text font-dm-sans font-normal leading-relaxed overflow-x-hidden">
        <Navigation />
        {children}
      </body>
    </html>
  )
}
