# CourtPass — later te bouwen

Dingen die bewust zijn uitgesteld, met genoeg context om ze later zonder
heruitzoekwerk op te pakken.

## E-mailbevestigingen (na een boeking / bij toevoegen aan een split)

**Gevraagd:** stuur een bevestigingsmail naar de boeker zodra een boeking
(en de bijbehorende credits-afschrijving) is gelukt, en naar elke
medespeler die met een account is toegevoegd aan een gesplitste boeking.

**Waarom het nu niet gebouwd is:** Supabase verstuurt zelf alleen e-mails
voor de eigen auth-flows (registratie, wachtwoord-reset) — geen losse
transactionele mails. Dit vraagt dus een externe e-mailprovider.

**Hoe dit te bouwen, als het zover is:**
1. Kies een provider (Resend heeft een ruime gratis tier en integreert
   makkelijk met Supabase Edge Functions — logische default, maar Postmark
   of SendGrid kan ook).
2. De gebruiker maakt zelf een account bij die provider aan en genereert
   een API-key. Die key wordt als secret aan een Supabase Edge Function
   gehangen (`supabase secrets set`) — nooit in de chat of in code plakken.
3. Bouw een Supabase Edge Function (draait los van de Next.js/Vercel-hosting,
   dus geen impact op de huidige `output: export` static site) die:
   - een booking-bevestiging stuurt naar `bookings.user_id` (via
     `profiles.email`) zodra een boeking succesvol is aangemaakt;
   - een uitnodiging/bevestiging stuurt naar elke `booking_splits`-rij met
     een `user_id` (niet naar gasten — die hebben geen account/e-mailadres
     in het systeem) zodra `create_booking_split` is aangeroepen.
4. Trigger-punt: het makkelijkst is een Postgres `on insert`-trigger op
   `bookings` en `booking_splits` die de Edge Function aanroept via
   `pg_net` of `supabase_functions.http_request`, zodat de e-mail ook
   verstuurd wordt als iemand rechtstreeks via de RPC boekt (niet alleen
   via de site-UI).
5. Inhoud: clubnaam, baan, datum/tijd, bedrag in credits, boekingscode.
   Voor een split-uitnodiging ook: wie de boeker is en hoeveel het eigen
   aandeel is, met een link naar het dashboard om te betalen.

**Wanneer oppakken:** zodra de gebruiker een e-mailprovider heeft gekozen
en een API-key heeft aangemaakt.
