import { supabase } from "@/lib/supabase"
import {
  calculatePrice,
  dayNameFor,
  freeAreaBucket,
  freeClubBucket,
  haversineKm,
  lastMinuteBucket,
  seasonFor,
  type PricingInputs,
  type PricingModel,
  type PricingResult,
  type ScoreTable,
} from "@/lib/pricing"

export interface Court {
  id: string
  clubId: string
  name: string
  indoor: boolean
  surface: string
  active: boolean
}

export interface Club {
  id: string
  ownerId: string | null
  name: string
  address: string
  lat: number
  lng: number
  tier: string
  openFrom: string
  openTo: string
  demand: string
  histOccupancy: string
  dynamicPricing: boolean
  courts: Court[]
}

export interface BookedSlot {
  clubId: string
  courtId: string
  date: string
  startTime: string
}

export interface PricingSnapshot {
  engineVersion: string
  inputs: PricingInputs
  breakdown: PricingResult["breakdown"]
  totalScore: number
  rawPrice: number
  minPrice: number
  maxPrice: number
  basePrice: number
  euroPerCredit: number
  weatherSource: string
  calculatedAt: string
}

export interface Booking {
  id: string
  bookingCode: string
  userId: string
  clubId: string
  clubName: string
  courtId: string
  courtName: string
  courtSurface: string | null
  courtIndoor: boolean | null
  date: string
  startTime: string
  endTime: string
  priceCredits: number
  priceEuro: number
  pricingSnapshot: PricingSnapshot
  status: "confirmed" | "cancelled"
  createdAt: string
}

/* ================= Reads ================= */

export async function fetchPricingModel(): Promise<PricingModel> {
  const [settingsRes, weightsRes, tablesRes, rowsRes] = await Promise.all([
    supabase.from("pricing_settings").select("*").eq("id", 1).single(),
    supabase.from("pricing_weights").select("*").order("sort_order"),
    supabase.from("pricing_score_tables").select("*"),
    supabase.from("pricing_score_rows").select("*").order("sort_order"),
  ])
  if (settingsRes.error) throw settingsRes.error
  if (weightsRes.error) throw weightsRes.error
  if (tablesRes.error) throw tablesRes.error
  if (rowsRes.error) throw rowsRes.error

  const scoreTables: Record<string, ScoreTable> = {}
  for (const t of tablesRes.data ?? []) {
    scoreTables[t.table_key] = { title: t.title, rows: [] }
  }
  for (const r of rowsRes.data ?? []) {
    scoreTables[r.table_key]?.rows.push({ value: r.value, score: Number(r.score) })
  }

  const s = settingsRes.data
  return {
    settings: {
      basePrice: Number(s.base_price),
      minPrice: Number(s.min_price),
      maxPrice: Number(s.max_price),
      radiusKm: Number(s.radius_km),
      euroPerCredit: Number(s.euro_per_credit),
      rainForecast: s.rain_forecast,
      bookingHorizonDays: s.booking_horizon_days,
      weatherApi: s.weather_api,
    },
    weights: (weightsRes.data ?? []).map((w) => ({
      key: w.key,
      label: w.label,
      weight: Number(w.weight),
      noTable: w.no_table,
    })),
    scoreTables,
  }
}

function mapClubRow(row: any): Club {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    tier: row.tier,
    openFrom: row.open_from,
    openTo: row.open_to,
    demand: row.demand,
    histOccupancy: row.hist_occupancy,
    dynamicPricing: row.dynamic_pricing,
    courts: (row.courts ?? []).map((c: any) => ({
      id: c.id,
      clubId: c.club_id,
      name: c.name,
      indoor: c.indoor,
      surface: c.surface,
      active: c.active,
    })),
  }
}

export async function fetchClubs(): Promise<Club[]> {
  const { data, error } = await supabase.from("clubs").select("*, courts(*)").order("name")
  if (error) throw error
  return (data ?? []).map(mapClubRow)
}

/** My favorited club ids, or an empty set for a signed-out visitor —
 * favoriting requires an account, but browsing/favoriting-state should
 * never throw for someone just looking around. */
export async function fetchMyFavoriteClubIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data, error } = await supabase.from("favorite_clubs").select("club_id").eq("user_id", user.id)
  if (error) throw error
  return new Set((data ?? []).map((r: any) => r.club_id))
}

export async function addFavoriteClub(clubId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Je moet ingelogd zijn om een club te favorieten.")
  const { error } = await supabase.from("favorite_clubs").insert({ user_id: user.id, club_id: clubId })
  if (error) throw error
}

export async function removeFavoriteClub(clubId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Je moet ingelogd zijn om een club te favorieten.")
  const { error } = await supabase.from("favorite_clubs").delete().eq("user_id", user.id).eq("club_id", clubId)
  if (error) throw error
}

export async function fetchClub(id: string): Promise<Club | null> {
  const { data, error } = await supabase.from("clubs").select("*, courts(*)").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapClubRow(data) : null
}

/** Confirmed bookings for a set of clubs within a date range — one query,
 * used both for a single day (dateFrom === dateTo, e.g. the "free courts
 * nearby" pricing input) and for a whole visible calendar month (to grey out
 * fully-booked days). */
export async function fetchBookedSlots(clubIds: string[], dateFrom: string, dateTo: string): Promise<BookedSlot[]> {
  if (clubIds.length === 0) return []
  const { data, error } = await supabase
    .from("bookings")
    .select("club_id, court_id, date, start_time")
    .in("club_id", clubIds)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .eq("status", "confirmed")
  if (error) throw error
  return (data ?? []).map((b) => ({ clubId: b.club_id, courtId: b.court_id, date: b.date, startTime: b.start_time }))
}

export async function fetchMyBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapBookingRow)
}

export async function fetchClubBookings(clubId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapBookingRow)
}

export function mapBookingRow(row: any): Booking {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    userId: row.user_id,
    clubId: row.club_id,
    clubName: row.club_name,
    courtId: row.court_id,
    courtName: row.court_name,
    courtSurface: row.court_surface,
    courtIndoor: row.court_indoor,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    priceCredits: Number(row.price_credits),
    priceEuro: Number(row.price_euro),
    pricingSnapshot: row.pricing_snapshot,
    status: row.status,
    createdAt: row.created_at,
  }
}

/* ================= Pure availability helpers (no I/O) =================
   Given already-fetched clubs + booked slots, these never touch the network,
   so they can be called freely while rendering without extra round trips. */

export function getTimeSlots(club: Club, model: PricingModel): string[] {
  const from = parseInt(club.openFrom, 10)
  const to = parseInt(club.openTo, 10)
  const table = model.scoreTables.time
  if (!table) return []
  return table.rows.map((r) => r.value).filter((t) => {
    const h = parseInt(t, 10)
    return h >= from && h < to
  })
}

export function isPast(dateStr: string, time: string): boolean {
  return new Date(`${dateStr}T${time}:00`) < new Date()
}

export function getAvailableCourts(club: Club, bookedSlots: BookedSlot[], dateStr: string, time: string): Court[] {
  if (isPast(dateStr, time)) return []
  const bookedCourtIds = new Set(
    bookedSlots.filter((b) => b.clubId === club.id && b.date === dateStr && b.startTime === time).map((b) => b.courtId),
  )
  return club.courts.filter((c) => c.active && !bookedCourtIds.has(c.id))
}

export function isTimeAvailable(club: Club, bookedSlots: BookedSlot[], dateStr: string, time: string): boolean {
  return getAvailableCourts(club, bookedSlots, dateStr, time).length > 0
}

export function countAvailable(club: Club, bookedSlots: BookedSlot[], dateStr: string, time: string): number {
  return getAvailableCourts(club, bookedSlots, dateStr, time).length
}

export function hasAnyAvailability(club: Club, model: PricingModel, bookedSlots: BookedSlot[], dateStr: string): boolean {
  return getTimeSlots(club, model).some((t) => isTimeAvailable(club, bookedSlots, dateStr, t))
}

/** Free courts at OTHER clubs within the configured radius — a pricing input. */
export function freeCourtsNearby(
  me: Club,
  allClubs: Club[],
  bookedSlots: BookedSlot[],
  dateStr: string,
  time: string,
  radiusKm: number,
): number {
  return allClubs
    .filter((c) => c.id !== me.id && haversineKm(me, c) <= radiusKm)
    .reduce((n, c) => n + countAvailable(c, bookedSlots, dateStr, time), 0)
}

/* ================= Pricing ================= */

export function getPricingInputs(
  club: Club,
  allClubs: Club[],
  bookedSlots: BookedSlot[],
  dateStr: string,
  time: string,
  model: PricingModel,
  weatherBucket: string,
): PricingInputs {
  const dt = new Date(`${dateStr}T${time}:00`)
  const hoursUntil = (dt.getTime() - Date.now()) / 36e5
  return {
    tier: club.tier,
    day: dayNameFor(dt),
    time,
    season: seasonFor(dt),
    weather: weatherBucket,
    freeClub: freeClubBucket(countAvailable(club, bookedSlots, dateStr, time)),
    freeArea: freeAreaBucket(freeCourtsNearby(club, allClubs, bookedSlots, dateStr, time, model.settings.radiusKm)),
    lastMinute: lastMinuteBucket(hoursUntil),
    demand: club.demand,
    histOccupancy: club.histOccupancy,
  }
}

export function getPrice(
  club: Club,
  allClubs: Club[],
  bookedSlots: BookedSlot[],
  dateStr: string,
  time: string,
  model: PricingModel,
  weatherBucket: string,
): PricingResult {
  const inputs = getPricingInputs(club, allClubs, bookedSlots, dateStr, time, model, weatherBucket)
  return calculatePrice(model, inputs)
}

/** Cheapest available price for a club/date/time — what a time slot shows.
 * Court-level pricing is otherwise identical (the model has no per-court
 * factor), so this doubles as "the" price for whichever court gets booked. */
export function getFromPrice(
  club: Club,
  allClubs: Club[],
  bookedSlots: BookedSlot[],
  dateStr: string,
  time: string,
  model: PricingModel,
  weatherBucket: string,
): PricingResult | null {
  const courts = getAvailableCourts(club, bookedSlots, dateStr, time)
  if (!courts.length) return null
  const result = getPrice(club, allClubs, bookedSlots, dateStr, time, model, weatherBucket)
  return result.error ? null : result
}

/* ================= Bookings ================= */

function generateBookingCode(): string {
  return (
    "CP-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  )
}

export class BookingUnavailableError extends Error {}
export class InsufficientCreditsError extends Error {}

/* ================= Pending credit purchase (sandbox-only crediting) =================
 * There is no payment webhook (this is a static-hosted site with no server
 * to receive one), so a Stripe purchase can't be verified server-side. As a
 * stand-in for testing, /betalen records what was about to be bought right
 * before sending the browser to Stripe, and /betaal-succes credits the
 * account for it on return. This is NOT secure — nothing stops a signed-in
 * user from visiting /betaal-succes directly and granting themselves
 * credits without paying — it only proves the credits flow end-to-end for
 * demo/testing. A real launch needs a server-verified webhook instead. */

const PENDING_PURCHASE_KEY = "courtpass-pending-purchase"
const PENDING_PURCHASE_MAX_AGE_MS = 30 * 60 * 1000

interface PendingPurchase {
  priceId: string
  credits: number
  ts: number
}

export function savePendingCreditPurchase(priceId: string, credits: number): void {
  if (typeof window === "undefined") return
  const purchase: PendingPurchase = { priceId, credits, ts: Date.now() }
  window.localStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(purchase))
}

/** Reads and clears the pending purchase, returning the credits to grant,
 * or null if there wasn't one (or it's stale). */
export function consumePendingCreditPurchase(): number | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(PENDING_PURCHASE_KEY)
  window.localStorage.removeItem(PENDING_PURCHASE_KEY)
  if (!raw) return null
  try {
    const purchase = JSON.parse(raw) as PendingPurchase
    if (Date.now() - purchase.ts > PENDING_PURCHASE_MAX_AGE_MS) return null
    return purchase.credits
  } catch {
    return null
  }
}

/* ================= Credits (dummy / sandbox) =================
 * Adjusted exclusively through the adjust_my_credits() Postgres function:
 * it scopes every change to the caller's own row and refuses to go
 * negative, so this is safe to call directly from the client. */

export async function fetchMyCreditsBalance(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0
  const { data, error } = await supabase.from("profiles").select("credits_balance").eq("id", user.id).maybeSingle()
  if (error) throw error
  return data ? Number(data.credits_balance) : 0
}

export type LedgerType =
  | "topup"
  | "subscription_grant"
  | "booking_charge"
  | "booking_refund"
  | "split_received"
  | "split_paid"
  | "rollover_expiry"
  | "adjustment"

export interface LedgerEntry {
  id: string
  type: LedgerType
  credits: number
  description: string | null
  bookingId: string | null
  createdAt: string
  balanceAfter: number
}

function mapLedgerRow(row: any): LedgerEntry {
  return {
    id: row.id,
    type: row.type,
    credits: Number(row.credits),
    description: row.description,
    bookingId: row.booking_id,
    createdAt: row.created_at,
    balanceAfter: Number(row.balance_after),
  }
}

/** delta > 0 adds credits, delta < 0 spends them (throws InsufficientCreditsError if it would go negative).
 * Every call writes an entry to credit_ledger — pass a type/description (and a
 * bookingId when relevant) so that audit trail stays meaningful. */
export async function adjustMyCredits(
  delta: number,
  type: LedgerType = "adjustment",
  description?: string,
  bookingId?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("adjust_my_credits", {
    delta,
    p_type: type,
    p_description: description ?? null,
    p_booking_id: bookingId ?? null,
  })
  if (error) {
    if (error.message?.includes("Insufficient credits")) {
      throw new InsufficientCreditsError("Niet genoeg credits voor deze boeking.")
    }
    throw error
  }
  return Number(data)
}

/** My own credit ledger, most recent first. */
export async function fetchMyLedger(limit = 50): Promise<LedgerEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(mapLedgerRow)
}

/** Creates a booking WITH a frozen pricing audit trail. The price and every
 * input that produced it are stored on the row, never recalculated later —
 * so a pricing-model change afterwards cannot rewrite what a customer paid.
 * The database's partial unique index is the real guard against double
 * booking; a 23505 violation here means someone else booked this exact
 * court/date/time a moment earlier.
 *
 * Credits are spent BEFORE the booking is inserted (so a customer without
 * enough balance never reaches a "confirmed" booking); if the insert then
 * fails for any reason, the spent credits are refunded. */
export async function createBooking(
  club: Club,
  court: Court,
  dateStr: string,
  time: string,
  price: PricingResult,
  weatherSource: string,
): Promise<Booking> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Je moet ingelogd zijn om te boeken.")
  if (price.error || !price.inputs) throw new Error(price.error || "Kon de prijs niet berekenen.")

  // Rounded to a whole credit: the dynamic pricing formula interpolates
  // linearly between min/max price, so it almost never lands on a round
  // number. Every display in the app already rounds for presentation
  // (Math.round) — this makes that the actual charged amount too, instead
  // of a display-only illusion, so splitting a booking never has to deal
  // with fractional credits.
  const spendAmount = Math.round(price.finalPrice)
  const bookingId = crypto.randomUUID()
  // No bookingId here: the booking row doesn't exist yet at this point (it's
  // inserted below, only after the charge succeeds), and credit_ledger.booking_id
  // has a foreign key into bookings — passing it here would violate that
  // constraint. The description carries enough context without the link.
  await adjustMyCredits(-spendAmount, "booking_charge", `${club.name} · ${court.name} · ${dateStr} ${time}`)

  const endTime = (parseInt(time, 10) + 1).toString().padStart(2, "0") + ":00"
  const snapshot: PricingSnapshot = {
    engineVersion: "excel-weighted-score-v1",
    inputs: price.inputs,
    breakdown: price.breakdown,
    totalScore: price.totalScore,
    rawPrice: price.rawPrice,
    minPrice: price.minPrice,
    maxPrice: price.maxPrice,
    basePrice: price.basePrice,
    euroPerCredit: price.euro / price.finalPrice,
    weatherSource,
    calculatedAt: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      id: bookingId,
      booking_code: generateBookingCode(),
      user_id: user.id,
      club_id: club.id,
      club_name: club.name,
      court_id: court.id,
      court_name: court.name,
      court_surface: court.surface,
      court_indoor: court.indoor,
      date: dateStr,
      start_time: time,
      end_time: endTime,
      price_credits: spendAmount,
      price_euro: +price.euro.toFixed(2),
      pricing_snapshot: snapshot,
    })
    .select()
    .single()

  if (error) {
    // No bookingId here either: the insert above failed, so no row with this
    // id exists to satisfy credit_ledger's foreign key.
    await adjustMyCredits(spendAmount, "booking_refund", "Boeking mislukt — automatisch terugbetaald").catch(
      () => undefined,
    )
    if (error.code === "23505") {
      throw new BookingUnavailableError("Deze baan is net door iemand anders geboekt. Kies een andere tijd of baan.")
    }
    throw error
  }
  return mapBookingRow(data)
}

/** Cancels a confirmed booking and refunds its credits atomically (see
 * cancel_my_booking in the DB) — so a booking can never be refunded twice. */
/** refund only matters for a staff cancellation of someone else's booking —
 * the server always refunds a customer cancelling their own booking,
 * regardless of what's passed here. */
export async function cancelBooking(id: string, refund: boolean = true): Promise<void> {
  const { error } = await supabase.rpc("cancel_my_booking", { p_booking_id: id, p_refund: refund })
  if (error) throw error
}

/* ================= Admin: profile / access ================= */

export interface Profile {
  id: string
  isPlatformAdmin: boolean
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
  if (error) throw error
  return data ? { id: data.id, isPlatformAdmin: data.is_platform_admin } : null
}

/** Clubs this user is allowed to manage: all of them for a platform admin,
 * only their own otherwise (RLS enforces the same rule server-side; this
 * just avoids showing clubs the UI couldn't save edits to anyway). */
export async function fetchManagedClubs(userId: string, isPlatformAdmin: boolean): Promise<Club[]> {
  let query = supabase.from("clubs").select("*, courts(*)").order("name")
  if (!isPlatformAdmin) query = query.eq("owner_id", userId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapClubRow)
}

/** Resolves an email to a user id, for a platform admin assigning club
 * ownership. Returns null when no account exists with that email. Only
 * works for a platform admin (RLS only lets them read every profile). */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("id").ilike("email", email.trim()).maybeSingle()
  if (error) throw error
  return data ? data.id : null
}

export async function assignClubOwner(clubId: string, ownerId: string | null): Promise<void> {
  const { error } = await supabase.from("clubs").update({ owner_id: ownerId }).eq("id", clubId)
  if (error) throw error
}

/** id -> email, for showing who owns a club. Only returns rows the caller
 * is allowed to see (their own profile, or every profile if platform admin). */
export async function fetchProfileEmails(ids: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (uniqueIds.length === 0) return {}
  const { data, error } = await supabase.from("profiles").select("id, email").in("id", uniqueIds)
  if (error) throw error
  const map: Record<string, string> = {}
  for (const row of data ?? []) if (row.email) map[row.id] = row.email
  return map
}

/* ================= Admin: wallets ================= */

export interface WalletSummary {
  userId: string
  email: string | null
  balance: number
  lifetimeTopUp: number
  lifetimeSpent: number
}

/** Platform-admin only (RLS: is_platform_admin lets them read every profile
 * and every ledger row). Aggregates the ledger client-side — there's no
 * separate view for this, it's just two selects and a reduce. */
export async function fetchAllWalletsSummary(): Promise<WalletSummary[]> {
  const [{ data: profiles, error: profilesError }, { data: ledger, error: ledgerError }] = await Promise.all([
    supabase.from("profiles").select("id, email, credits_balance"),
    supabase.from("credit_ledger").select("user_id, type, credits"),
  ])
  if (profilesError) throw profilesError
  if (ledgerError) throw ledgerError

  const topUpByUser = new Map<string, number>()
  const spentByUser = new Map<string, number>()
  for (const row of ledger ?? []) {
    if (row.type === "topup" || row.type === "subscription_grant") {
      topUpByUser.set(row.user_id, (topUpByUser.get(row.user_id) ?? 0) + Number(row.credits))
    } else if (row.type === "booking_charge") {
      spentByUser.set(row.user_id, (spentByUser.get(row.user_id) ?? 0) + Math.abs(Number(row.credits)))
    }
  }

  return (profiles ?? [])
    .map((p) => ({
      userId: p.id,
      email: p.email,
      balance: Number(p.credits_balance),
      lifetimeTopUp: topUpByUser.get(p.id) ?? 0,
      lifetimeSpent: spentByUser.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.balance - a.balance)
}

/** Platform-admin only. */
export async function fetchUserLedger(userId: string, limit = 100): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(mapLedgerRow)
}

/** Platform-admin only manual correction — always requires a reason, and is
 * itself scoped/validated server-side by admin_adjust_credits (see 0004). */
export async function adminAdjustCredits(userId: string, delta: number, reason: string): Promise<number> {
  const { data, error } = await supabase.rpc("admin_adjust_credits", { target_user: userId, delta, reason })
  if (error) throw error
  return Number(data)
}

/* ================= Admin: clubs & courts ================= */

export interface ClubInput {
  name: string
  address: string
  lat: number
  lng: number
  tier: string
  openFrom: string
  openTo: string
  demand: string
  histOccupancy: string
}

function clubInputToRow(input: ClubInput) {
  return {
    name: input.name,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    tier: input.tier,
    open_from: input.openFrom,
    open_to: input.openTo,
    demand: input.demand,
    hist_occupancy: input.histOccupancy,
  }
}

export async function createClub(input: ClubInput, ownerId: string | null): Promise<Club> {
  const { data, error } = await supabase
    .from("clubs")
    .insert({ ...clubInputToRow(input), owner_id: ownerId })
    .select("*, courts(*)")
    .single()
  if (error) throw error
  return mapClubRow(data)
}

export async function updateClub(clubId: string, input: ClubInput): Promise<void> {
  const { error } = await supabase.from("clubs").update(clubInputToRow(input)).eq("id", clubId)
  if (error) throw error
}

export async function deleteClub(clubId: string): Promise<void> {
  const { error } = await supabase.from("clubs").delete().eq("id", clubId)
  if (error) throw error
}

export interface CourtInput {
  name: string
  indoor: boolean
  surface: string
  active: boolean
}

export async function addCourt(clubId: string, input: CourtInput): Promise<Court> {
  const { data, error } = await supabase
    .from("courts")
    .insert({ club_id: clubId, name: input.name, indoor: input.indoor, surface: input.surface, active: input.active })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, clubId: data.club_id, name: data.name, indoor: data.indoor, surface: data.surface, active: data.active }
}

export async function updateCourt(courtId: string, input: CourtInput): Promise<void> {
  const { error } = await supabase
    .from("courts")
    .update({ name: input.name, indoor: input.indoor, surface: input.surface, active: input.active })
    .eq("id", courtId)
  if (error) throw error
}

export async function deleteCourt(courtId: string): Promise<void> {
  const { error } = await supabase.from("courts").delete().eq("id", courtId)
  if (error) throw error
}

/* ================= Admin: pricing model ================= */

export async function updatePricingSettings(settings: PricingModel["settings"]): Promise<void> {
  const { error } = await supabase
    .from("pricing_settings")
    .update({
      base_price: settings.basePrice,
      min_price: settings.minPrice,
      max_price: settings.maxPrice,
      radius_km: settings.radiusKm,
      euro_per_credit: settings.euroPerCredit,
      rain_forecast: settings.rainForecast,
      booking_horizon_days: settings.bookingHorizonDays,
      weather_api: settings.weatherApi,
    })
    .eq("id", 1)
  if (error) throw error
}

export async function updatePricingWeight(key: string, weight: number): Promise<void> {
  const { error } = await supabase.from("pricing_weights").update({ weight }).eq("key", key)
  if (error) throw error
}

export async function updateScoreRow(tableKey: string, value: string, score: number): Promise<void> {
  const { error } = await supabase.from("pricing_score_rows").update({ score }).eq("table_key", tableKey).eq("value", value)
  if (error) throw error
}

/* ================= Admin: all bookings (RLS scopes this per role) ================= */

export async function fetchAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapBookingRow)
}
