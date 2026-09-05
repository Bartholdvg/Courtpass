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

function mapBookingRow(row: any): Booking {
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

/** Creates a booking WITH a frozen pricing audit trail. The price and every
 * input that produced it are stored on the row, never recalculated later —
 * so a pricing-model change afterwards cannot rewrite what a customer paid.
 * The database's partial unique index is the real guard against double
 * booking; a 23505 violation here means someone else booked this exact
 * court/date/time a moment earlier. */
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
      price_credits: +price.finalPrice.toFixed(2),
      price_euro: +price.euro.toFixed(2),
      pricing_snapshot: snapshot,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new BookingUnavailableError("Deze baan is net door iemand anders geboekt. Kies een andere tijd of baan.")
    }
    throw error
  }
  return mapBookingRow(data)
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id)
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
