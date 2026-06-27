// Synthetic historical interval data so the forecasting methods have something
// real to train on and be back-tested against. Deterministic (seeded), with
// trend + day-of-week seasonality + interval shape + noise.
import { SHAPE, PEAKS } from './seed.js'
import { TODAY, addDays, dowOf } from '../lib/dates.js'

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Mon-heavy, weekend-light multipliers (index by day-of-week, 0=Sun … 6=Sat).
const DOW_FACTOR = [0.62, 1.06, 1.00, 0.99, 1.03, 0.94, 0.70]
const DOW_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const HISTORY_DAYS = 35

// Build the historical series for a queue: an array of days, each a 24-length
// interval profile. The last entry is "yesterday". dow[d] gives its weekday.
export function historyFor(queueId) {
  const peak = PEAKS[queueId] ?? 40
  const rnd = mulberry32(queueId.split('').reduce((a, c) => a + c.charCodeAt(0), 7))
  const days = []
  const dows = []
  for (let d = 0; d < HISTORY_DAYS; d++) {
    // day d's calendar date — the last entry (d = HISTORY_DAYS-1) is TODAY-1.
    const date = addDays(TODAY, -(HISTORY_DAYS - d))
    const dow = dowOf(date)
    const trend = 1 + d * 0.0035                 // slow organic growth
    const dowF = DOW_FACTOR[dow]
    const day = SHAPE.map((s) => {
      const noise = 1 + (rnd() - 0.5) * 0.16     // ±8% interval noise
      return Math.max(0, Math.round(peak * s * dowF * trend * noise))
    })
    days.push(day)
    dows.push(dow)
  }
  return { days, dows, dowName: DOW_NAME }
}

// The weekday we are forecasting next (the day after the last history day).
export function nextDow(queueId) {
  const { dows } = historyFor(queueId)
  return (dows[dows.length - 1] + 1) % 7
}
