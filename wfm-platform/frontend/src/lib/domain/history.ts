// Synthetic historical interval data the forecasting models train on.
//
// ~3 years (1,110 days) per queue so the models have real long-range structure to
// learn: multi-year trend + annual (day-of-year) seasonality + weekly seasonality
// + intraday shape + a holiday dip + noise. Deterministic (seeded) and memoised so
// the large series is generated only once per queue.
import { addDays, dayOfYear, dowOf, TODAY } from "./dates"
import { PEAKS, SHAPE } from "./seed"

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Mon-heavy, weekend-light weekly multipliers (index by weekday, 0=Sun … 6=Sat).
const DOW_FACTOR = [0.62, 1.06, 1.0, 0.99, 1.03, 0.94, 0.7]

const ANNUAL_GROWTH = 0.09 // ~9% organic growth per year
const ANNUAL_AMP = 0.13 // seasonal swing amplitude
const ANNUAL_PEAK_DOY = 320 // peak demand mid-November (pre-holiday)
const TWO_PI = Math.PI * 2

export const HISTORY_DAYS = 1110 // ~3 years + a margin

// Annual seasonality multiplier for a given day-of-year (peaks in Q4, dips ~July).
function annualFactor(doy: number): number {
  return 1 + ANNUAL_AMP * Math.cos((TWO_PI * (doy - ANNUAL_PEAK_DOY)) / 365)
}

// Holiday effect: sharp dip over the year-end break, small new-year recovery.
function holidayFactor(doy: number): number {
  if (doy >= 358 || doy <= 1) return 0.6 // 24 Dec – 1 Jan shutdown
  if (doy >= 350 && doy < 358) return 0.85 // wind-down week
  return 1
}

export interface History {
  days: number[][] // [day][interval] contact volume
  dows: number[] // weekday per day
  doys: number[] // day-of-year per day
}

const cache = new Map<string, History>()

export function historyFor(queueId: string): History {
  const hit = cache.get(queueId)
  if (hit) return hit

  const peak = PEAKS[queueId] ?? 40
  const rnd = mulberry32(queueId.split("").reduce((a, c) => a + c.charCodeAt(0), 7))
  const days: number[][] = []
  const dows: number[] = []
  const doys: number[] = []

  for (let d = 0; d < HISTORY_DAYS; d++) {
    // day d's calendar date — the last entry (d = HISTORY_DAYS-1) is TODAY-1.
    const date = addDays(TODAY, -(HISTORY_DAYS - d))
    const dow = dowOf(date)
    const doy = dayOfYear(date)
    const trend = 1 + (d / 365) * ANNUAL_GROWTH
    const seasonal = DOW_FACTOR[dow] * annualFactor(doy) * holidayFactor(doy)
    const day = SHAPE.map((s) => {
      const noise = 1 + (rnd() - 0.5) * 0.14 // ±7% interval noise
      return Math.max(0, Math.round(peak * s * seasonal * trend * noise))
    })
    days.push(day)
    dows.push(dow)
    doys.push(doy)
  }

  const result = { days, dows, doys }
  cache.set(queueId, result)
  return result
}
