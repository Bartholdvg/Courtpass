/**
 * Live rain-chance forecast per club/date, used as a pricing input.
 * Async by nature, so results are cached and read back synchronously by the
 * pricing calculation. A slow, offline, or out-of-range forecast API can
 * never break booking: getRainBucket() falls back to the admin-configured
 * value, and fetchForecast() never throws.
 */

interface CacheEntry {
  bucket: string
  percent: number
}

const cache = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<boolean>>()

function bucketFor(percent: number): string {
  if (percent <= 20) return "0-20%"
  if (percent <= 40) return "20-40%"
  if (percent <= 60) return "40-60%"
  if (percent <= 80) return "60-80%"
  return "80-100%"
}

export function getRainBucket(clubId: string, dateStr: string, fallback: string): string {
  const hit = cache.get(`${clubId}|${dateStr}`)
  return hit ? hit.bucket : fallback
}

export function isForecastLive(clubId: string, dateStr: string): boolean {
  return cache.has(`${clubId}|${dateStr}`)
}

/** Resolves to true when it fetched NEW data (caller should re-render). */
export async function fetchForecast(
  clubId: string,
  dateStr: string,
  lat: number,
  lng: number,
  enabled: boolean,
): Promise<boolean> {
  const key = `${clubId}|${dateStr}`
  if (cache.has(key)) return false
  if (!enabled) return false
  const inFlight = pending.get(key)
  if (inFlight) return inFlight

  const p = (async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=precipitation_probability_max&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`weather api ${res.status}`)
      const json = await res.json()
      const pct = json?.daily?.precipitation_probability_max?.[0]
      if (pct === null || pct === undefined) throw new Error("no forecast for this date")
      cache.set(key, { bucket: bucketFor(pct), percent: pct })
      return true
    } catch (err) {
      console.info("weather: falling back to configured rain chance —", (err as Error).message)
      return false
    } finally {
      pending.delete(key)
    }
  })()

  pending.set(key, p)
  return p
}
