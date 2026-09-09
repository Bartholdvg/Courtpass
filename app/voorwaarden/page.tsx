import Link from "next/link"

export const metadata = {
  title: "Algemene voorwaarden — CourtPass",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-playfair text-xl font-bold mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-text2 leading-relaxed">{children}</div>
    </div>
  )
}

export default function VoorwaardenPage() {
  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container-max px-4 md:px-6 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-lime mb-2">Legal</p>
        <h1 className="font-playfair text-4xl font-bold mb-2">Algemene voorwaarden</h1>
        <p className="text-text3 text-sm mb-10">Laatst bijgewerkt: september 2026</p>

        <Section title="1. Wie we zijn">
          <p>
            Court<span className="text-lime">Pass</span> (&ldquo;CourtPass&rdquo;, &ldquo;wij&rdquo;) is een platform waarmee spelers tennisbanen bij aangesloten
            clubs kunnen boeken via credits, in plaats van een vast lidmaatschap bij één club.
          </p>
        </Section>

        <Section title="2. Je account">
          <p>Je moet een account aanmaken om een baan te boeken. Je bent zelf verantwoordelijk voor het geheimhouden van je inloggegevens en voor alle activiteit onder je account.</p>
          <p>Je bent verplicht juiste en actuele gegevens te verstrekken, waaronder een geldig e-mailadres waarop je bereikbaar bent.</p>
        </Section>

        <Section title="3. Boekingen en credits">
          <p>Een boeking wordt betaald met credits die je vooraf koopt of ontvangt via een abonnement. De prijs van een boeking in credits wordt bepaald op het moment van boeken en kan per club, tijdstip en drukte verschillen.</p>
          <p>Een bevestigde boeking ontvang je per e-mail, met een unieke boekingscode. Bewaar deze — sommige clubs vragen erom bij aankomst.</p>
        </Section>

        <Section title="4. Annuleren">
          <p>Je kunt een boeking tot 12 uur voor de starttijd kosteloos annuleren; de credits worden dan teruggestort op je account.</p>
          <p>Annuleer je binnen 12 uur voor de starttijd, dan vervalt het recht op terugbetaling. De club kan in dat geval, naar eigen inzicht, alsnog besluiten credits terug te storten (bijvoorbeeld bij overmacht).</p>
        </Section>

        <Section title="5. Gedrag bij de club">
          <p>Bij de club gelden, naast deze voorwaarden, ook de huisregels van de betreffende club. Bij herhaald misbruik (bijvoorbeeld het stelselmatig niet komen opdagen bij een boeking) kan CourtPass een account beperken of blokkeren.</p>
        </Section>

        <Section title="6. Aansprakelijkheid">
          <p>CourtPass bemiddelt tussen speler en club, maar is geen eigenaar van de banen en heeft geen invloed op de fysieke staat van de faciliteiten. Wij zijn niet aansprakelijk voor schade of letsel opgelopen tijdens het gebruik van een baan bij een aangesloten club, behoudens opzet of grove nalatigheid onzerzijds.</p>
        </Section>

        <Section title="7. Wijzigingen">
          <p>We kunnen deze voorwaarden van tijd tot tijd aanpassen. Bij belangrijke wijzigingen laten we dit weten via e-mail of een melding in de app.</p>
        </Section>

        <Section title="8. Contact">
          <p>
            Vragen over deze voorwaarden? Neem contact op via de{" "}
            <a href="/#contact" className="text-lime hover:underline">
              contactsectie
            </a>{" "}
            op de homepage.
          </p>
        </Section>

        <Link href="/" className="text-sm text-text2 hover:text-text transition-colors">
          ← Terug naar home
        </Link>
      </div>
    </main>
  )
}
