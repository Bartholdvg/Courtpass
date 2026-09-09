import Link from "next/link"

export const metadata = {
  title: "Privacybeleid — CourtPass",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-playfair text-xl font-bold mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-text2 leading-relaxed">{children}</div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container-max px-4 md:px-6 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-lime mb-2">Legal</p>
        <h1 className="font-playfair text-4xl font-bold mb-2">Privacybeleid</h1>
        <p className="text-text3 text-sm mb-10">Laatst bijgewerkt: september 2026</p>

        <Section title="1. Welke gegevens we verzamelen">
          <p>Om een account aan te maken en banen te kunnen boeken, verzamelen we:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>E-mailadres en naam (verplicht bij registratie).</li>
            <li>Telefoonnummer, adres, postcode en stad (optioneel, alleen als je die zelf invult).</li>
            <li>Boekingsgegevens: welke club, baan, datum, tijd en prijs.</li>
            <li>Bij gebruik van locatie-check-in: je GPS-positie op het moment van inchecken, alleen om te bepalen of je bij de club in de buurt bent — deze wordt niet doorlopend bijgehouden.</li>
            <li>Bij inloggen met Google of Microsoft: naam en e-mailadres zoals die bij dat account bekend zijn.</li>
          </ul>
        </Section>

        <Section title="2. Waarvoor we deze gebruiken">
          <p>Uitsluitend om de dienst te leveren: je account beheren, boekingen verwerken, credits en betalingen bijhouden, je bevestigingen sturen, en — als de club dat aanbiedt — je in te checken bij aankomst.</p>
        </Section>

        <Section title="3. Met wie we gegevens delen">
          <ul className="list-disc pl-5 space-y-1">
            <li>De club waar je een baan boekt ziet je naam/e-mailadres en boekingsgegevens, zodat zij je boeking kunnen herkennen en inchecken.</li>
            <li>Medespelers die je aan een boeking toevoegt zien elkaars e-mailadres, nodig om de kosten te kunnen splitsen.</li>
            <li>We gebruiken Supabase voor hosting van onze database en accounts, en Resend voor het versturen van e-mails. Beide verwerken gegevens namens ons, niet voor eigen doeleinden.</li>
            <li>We verkopen jouw gegevens nooit aan derden.</li>
          </ul>
        </Section>

        <Section title="4. Bewaartermijn">
          <p>We bewaren je gegevens zolang je een account hebt. Vraag je je account te laten verwijderen, dan verwijderen we je persoonsgegevens, met uitzondering van wat we wettelijk verplicht zijn te bewaren (bijvoorbeeld voor de boekhouding).</p>
        </Section>

        <Section title="5. Jouw rechten">
          <p>Je hebt recht op inzage, correctie en verwijdering van je gegevens, en op het overdragen ervan naar een andere partij. Je kunt je gegevens grotendeels zelf inzien en aanpassen via &ldquo;Mijn gegevens&rdquo; op je dashboard; voor al het overige kun je contact met ons opnemen.</p>
        </Section>

        <Section title="6. Cookies en lokale opslag">
          <p>We gebruiken geen trackingcookies. De site slaat wel wat gegevens lokaal in je browser op (localStorage) — je inlogsessie en je taalkeuze — puur om de site te laten werken, niet om je te volgen.</p>
        </Section>

        <Section title="7. Contact">
          <p>
            Vragen over je gegevens? Neem contact op via de{" "}
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
