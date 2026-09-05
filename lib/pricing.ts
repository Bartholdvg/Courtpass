/**
 * Dynamic pricing engine — ported 1:1 from Dynamic_Pricing_Model_CourtPass.xlsx.
 * Pure functions only: no DOM, no network, no storage. This is deliberate so
 * the exact same code can run in the Next.js app today and in a future
 * native/PWA app without changes — only the data feeding it differs.
 *
 * Weighted score model (NOT multiplicative factors): every factor gets a
 * score 1-10 from its own score table, multiplied by a weight (weights sum
 * to 100%).
 *   weightedScore (1-10) -> price = Min + (score-1)/9 * (Max-Min)
 *   final price clamped between Min and Max        (Excel: MEDIAN)
 *   euro = credits * euroPerCredit                 (Excel: Berekeningen!B21*0.285)
 */

export interface ScoreTableRow {
  value: string
  score: number
}

export interface ScoreTable {
  title: string
  rows: ScoreTableRow[]
}

export interface PricingWeight {
  key: string
  label: string
  weight: number
  noTable?: boolean
}

export interface PricingSettings {
  basePrice: number
  minPrice: number
  maxPrice: number
  radiusKm: number
  euroPerCredit: number
  rainForecast: string
  bookingHorizonDays: number
  weatherApi: boolean
}

export interface PricingModel {
  settings: PricingSettings
  weights: PricingWeight[]
  scoreTables: Record<string, ScoreTable>
}

export interface PricingInputs {
  tier: string
  day: string
  time: string
  season: string
  weather: string
  freeClub: string
  freeArea: string
  lastMinute: string
  demand: string
  histOccupancy: string
  [key: string]: string
}

export interface PricingBreakdownRow {
  key: string
  label: string
  value: string
  score: number
  weight: number
  contribution: number
}

export interface PricingResult {
  error?: string
  breakdown: PricingBreakdownRow[]
  totalScore: number
  rawPrice: number
  finalPrice: number
  credits: number
  euro: number
  minPrice: number
  maxPrice: number
  basePrice: number
  inputs?: PricingInputs
}

function scoreLookup(model: PricingModel, tableKey: string, value: string): number | null {
  const table = model.scoreTables[tableKey]
  if (!table) return null
  const row = table.rows.find((r) => r.value === value)
  return row ? row.score : null
}

/**
 * calculatePrice — the central pricing engine (Excel sheet "Berekeningen").
 * `finalPrice` is the only thing a CUSTOMER should ever be shown; `breakdown`
 * (per-factor score/weight/contribution) is ADMIN-ONLY.
 */
export function calculatePrice(model: PricingModel, inputs: PricingInputs): PricingResult {
  const s = model.settings
  const isWeekend = inputs.day === "Zaterdag" || inputs.day === "Zondag"
  const breakdown: PricingBreakdownRow[] = []
  let total = 0

  for (const w of model.weights) {
    if (w.noTable) continue
    const tableKey = w.key === "time" && isWeekend ? "timeWeekend" : w.key
    const value = inputs[w.key] ?? ""
    const score = scoreLookup(model, tableKey, value)
    if (score === null) {
      return {
        error: `No score for ${w.label}: "${value}"`,
        breakdown: [],
        totalScore: 0,
        rawPrice: 0,
        finalPrice: 0,
        credits: 0,
        euro: 0,
        minPrice: s.minPrice,
        maxPrice: s.maxPrice,
        basePrice: s.basePrice,
      }
    }
    const contribution = score * w.weight
    total += contribution
    breakdown.push({ key: w.key, label: w.label, value, score, weight: w.weight, contribution })
  }

  const raw = s.minPrice + ((total - 1) / 9) * (s.maxPrice - s.minPrice)
  const final = Math.min(Math.max(raw, s.minPrice), s.maxPrice)
  return {
    breakdown,
    totalScore: total,
    rawPrice: raw,
    finalPrice: final,
    credits: Math.round(final),
    euro: final * s.euroPerCredit,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    basePrice: s.basePrice,
    inputs,
  }
}

/* ---- Helpers that translate real-world context into model vocabulary.
   These are prototype assumptions (the Excel takes these as manual input). */

const NL_DAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"]

export function dayNameFor(date: Date): string {
  return NL_DAYS[date.getDay()]!
}

export function seasonFor(date: Date): string {
  const m = date.getMonth() + 1
  if (m === 12 || m <= 2) return "Winter"
  if (m <= 5) return "Lente"
  if (m <= 8) return "Zomer"
  return "Herfst"
}

export function lastMinuteBucket(hoursUntilStart: number): string {
  const h = hoursUntilStart
  if (h >= 72) return "72 uur"
  if (h >= 48) return "48 uur"
  if (h >= 24) return "24 uur"
  if (h >= 12) return "12 uur"
  if (h >= 6) return "6 uur"
  if (h >= 3) return "3 uur"
  if (h >= 1) return "1 uur"
  if (h >= 0.5) return "30 minuten"
  return "15 minuten"
}

export function freeClubBucket(n: number): string {
  if (n <= 0) return "0 banen"
  if (n === 1) return "1 baan"
  if (n === 2) return "2 banen"
  if (n === 3) return "3 banen"
  if (n === 4) return "4 banen"
  return "5+ banen"
}

export function freeAreaBucket(n: number): string {
  if (n <= 0) return "0 banen"
  if (n <= 2) return "1-2 banen"
  if (n <= 5) return "3-5 banen"
  if (n <= 10) return "6-10 banen"
  return "10+ banen"
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
