import Link from "next/link"

export const metadata = {
  title: "Veelgestelde vragen — CourtPass",
}

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Wat is CourtPass?",
    a: "CourtPass is één abonnement waarmee je tennisbanen kunt boeken bij meerdere aangesloten clubs, zonder dat je bij elke club apart lid hoeft te worden.",
  },
  {
    q: "Hoe werken credits?",
    a: "Elke boeking kost credits in plaats van een vast bedrag per uur — de prijs hangt af van club, tijdstip en drukte. Je koopt credits los bij of krijgt ze maandelijks via een abonnement.",
  },
  {
    q: "Bij welke clubs kan ik spelen?",
    a: (
      <>
        Bekijk het actuele aanbod op de{" "}
        <Link href="/clubs" className="text-lime hover:underline">
          clubs-pagina
        </Link>
        . Daar zie je ook per club de openingstijden en beschikbare banen.
      </>
    ),
  },
  {
    q: "Kan ik de kosten van een boeking splitsen met vrienden?",
    a: "Ja. Bij het boeken kies je met hoeveel spelers je speelt en verdeel je het aandeel per persoon. Medespelers met een account krijgen een verzoek op hun dashboard; je kunt ook gasten zonder account toevoegen, dan betaal je zelf hun aandeel.",
  },
  {
    q: "Hoe annuleer ik een boeking, en krijg ik mijn credits terug?",
    a: "Annuleer je meer dan 12 uur van tevoren, dan krijg je je credits altijd volledig terug. Annuleer je binnen 12 uur voor de starttijd, dan vervalt dat recht — de club kan in dat geval alsnog besluiten credits terug te storten.",
  },
  {
    q: "Wat is de QR- of locatie-check-in?",
    a: "Sommige clubs vragen je om bij aankomst in te checken: laat een QR-code op je telefoon scannen bij de balie, of check in via je locatie als je al bij de club bent. Dit staat alleen aan bij clubs die dat zelf hebben ingeschakeld.",
  },
  {
    q: "Ik ben een tennisclub — hoe sluit ik aan bij CourtPass?",
    a: (
      <>
        Leuk dat je interesse hebt! Vul het formulier in op de{" "}
        <Link href="/aansluiten" className="text-lime hover:underline">
          aansluiten-pagina
        </Link>
        , dan nemen we contact met je op.
      </>
    ),
  },
  {
    q: "Is mijn data veilig?",
    a: (
      <>
        We delen je gegevens nooit met derden voor eigen doeleinden — lees ons volledige{" "}
        <Link href="/privacy" className="text-lime hover:underline">
          privacybeleid
        </Link>{" "}
        voor de details.
      </>
    ),
  },
  {
    q: "Ik heb nog een andere vraag — hoe bereik ik jullie?",
    a: (
      <>
        Gebruik het contactformulier op de{" "}
        <a href="/#contact" className="text-lime hover:underline">
          homepage
        </a>
        .
      </>
    ),
  },
]

export default function FaqPage() {
  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container-max px-4 md:px-6 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-lime mb-2">Support</p>
        <h1 className="font-playfair text-4xl font-bold mb-10">Veelgestelde vragen</h1>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <details key={i} className="group border border-border rounded-2xl px-5 py-4 open:bg-surface/40">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-text text-sm">
                {item.q}
                <span className="text-text3 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <div className="text-sm text-text2 leading-relaxed mt-3">{item.a}</div>
            </details>
          ))}
        </div>

        <Link href="/" className="inline-block mt-10 text-sm text-text2 hover:text-text transition-colors">
          ← Terug naar home
        </Link>
      </div>
    </main>
  )
}
