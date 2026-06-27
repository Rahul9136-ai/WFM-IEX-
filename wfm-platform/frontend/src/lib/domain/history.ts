// Synthetic historical interval data the forecasting models train on.
import { addDays, dowOf, TODAY } from "./dates"
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

const DOW_FACTOR = [0.62, 1.06, 1.0, 0.99, 1.03, 0.94, 0.7]

export const HISTORY_DAYS = 35

export interface History {
  days: number[][]
  dows: number[]
}

export function historyFor(queueId: string): History {
  const peak = PEAKS[queueId] ?? 40
  const rnd = mulberry32(queueId.split("").reduce((a, c) => a + c.charCodeAt(0), 7))
  const days: number[][] = []
  const dows: number[] = []
  for (let d = 0; d < HISTORY_DAYS; d++) {
    const date = addDays(TODAY, -(HISTORY_DAYS - d))
    const dow = dowOf(date)
    const trend = 1 + d * 0.0035
    const dowF = DOW_FACTOR[dow]
    const day = SHAPE.map((s) => {
      const noise = 1 + (rnd() - 0.5) * 0.16
      return Math.max(0, Math.round(peak * s * dowF * trend * noise))
    })
    days.push(day)
    dows.push(dow)
  }
  return { days, dows }
}
