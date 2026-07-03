// Granularity layer — rolls the day-level forecasting + Erlang engine up to
// Daily (30-min intervals), Weekly (per-day) and Monthly (per-week) views.
import { historyFor, HISTORY_DAYS } from '../data/history.js'
import { INTERVALS } from '../data/seed.js'
import { METHODS, methodById, mape } from './forecast.js'
import { buildPlan, summarisePlan } from './planning.js'
import { enumerateDays, dowOf, dayIndex, dayOfYear, fmtDay, fmtShort, weekKey, weekLabel, monthKey, monthLabel, MAX_RANGE_DAYS } from './dates.js'

export const GRANULARITIES = [
  { id: 'daily',   name: 'Daily',   sub: 'one day · 30-min intervals' },
  { id: 'weekly',  name: 'Weekly',  sub: 'next 7 days · per-day' },
  { id: 'monthly', name: 'Monthly', sub: 'next 4 weeks · per-week' },
]

const DOW_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const sum = (a) => a.reduce((x, y) => x + y, 0)
const dayTotal = (m, days, dows, dow, idx, doys, doy) => sum(m.fn(days, dows, dow, idx, doys, doy))

// ---- back-test (drives the per-method MAPE + the back-test chart) ----
// Resolution: daily → 24 interval values of the held-out day; weekly → 7 daily
// totals; monthly → 14 daily totals. Lower MAPE = tighter fit.
export function backtestG(queueId, gran) {
  const { days, dows, doys } = historyFor(queueId)

  if (gran === 'daily') {
    const L = days.length - 1
    const train = days.slice(0, L), tdows = dows.slice(0, L), tdoys = doys.slice(0, L)
    const actual = days[L]
    const perMethod = METHODS.map((m) => {
      const pred = m.fn(train, tdows, dows[L], L, tdoys, doys[L])
      return { id: m.id, name: m.name, kind: m.kind, mape: mape(pred, actual), pred }
    })
    const best = perMethod.reduce((a, b) => (b.mape < a.mape ? b : a))
    return { perMethod, best, actual, labels: INTERVALS.map((i) => i.label), unit: 'contacts / interval', holdoutDow: dows[L] }
  }

  const window = gran === 'weekly' ? 7 : 14
  const start = days.length - window
  const actual = [], labels = []
  for (let d = start; d < days.length; d++) {
    actual.push(sum(days[d]))
    labels.push(DOW_NAME[dows[d]])
  }
  const perMethod = METHODS.map((m) => {
    const pred = []
    for (let d = start; d < days.length; d++) {
      pred.push(dayTotal(m, days.slice(0, d), dows.slice(0, d), dows[d], d, doys.slice(0, d), doys[d]))
    }
    return { id: m.id, name: m.name, kind: m.kind, mape: mape(pred, actual), pred }
  })
  const best = perMethod.reduce((a, b) => (b.mape < a.mape ? b : a))
  return { perMethod, best, actual, labels, unit: 'contacts / day' }
}

// ---- date-range plan ----------------------------------------------------------
// Forecast the chosen method across an explicit start→end date range, then group
// the per-day results into buckets by granularity (day / week / month).

// 24-interval forecast profile for a single calendar date.
export function dayProfile(queueId, date, methodId) {
  const { days, dows, doys } = historyFor(queueId)
  const m = methodById[methodId] ?? METHODS[0]
  return m.fn(days, dows, dowOf(date), dayIndex(date, HISTORY_DAYS), doys, dayOfYear(date))
}

export function rangePlan(queueId, start, end, gran, methodId, aht, queue, shrinkage, agents) {
  const dates = enumerateDays(start, end)
  const { days, dows, doys } = historyFor(queueId)
  const m = methodById[methodId] ?? METHODS[0]

  // per-day summaries across the range
  const perDay = dates.map((date) => {
    const profile = m.fn(days, dows, dowOf(date), dayIndex(date, HISTORY_DAYS), doys, dayOfYear(date))
    const s = summarisePlan(buildPlan(profile, aht, queue, shrinkage, agents))
    return { date, volume: s.totalVol, reqH: s.reqHours, schedH: s.schedHours, wSL: s.wSL }
  })

  // grouping
  const keyFn = gran === 'monthly' ? monthKey : gran === 'weekly' ? weekKey : (d) => d.getTime()
  const labelFn = gran === 'monthly' ? monthLabel : gran === 'weekly' ? weekLabel : fmtDay
  const groups = new Map()
  perDay.forEach((p) => {
    const k = keyFn(p.date)
    if (!groups.has(k)) groups.set(k, { label: labelFn(p.date), volume: 0, reqH: 0, schedH: 0, slw: 0 })
    const g = groups.get(k)
    g.volume += p.volume; g.reqH += p.reqH; g.schedH += p.schedH; g.slw += p.wSL * p.volume
  })

  const rows = [...groups.values()].map((g) => ({
    label: g.label,
    volume: g.volume,
    required: Math.round(g.reqH),
    scheduled: Math.round(g.schedH),
    variance: Math.round(g.schedH - g.reqH),
    projSL: g.volume ? g.slw / g.volume : 0,
  }))

  const bucket = gran === 'monthly' ? 'month' : gran === 'weekly' ? 'week' : 'day'
  return { rows, unit: 'agent-hrs', bucket, nDays: dates.length, truncated: dates.length >= MAX_RANGE_DAYS }
}

// Summary numbers for a bucketed plan (used by AI insight + headline stats).
export function summariseBuckets(rows) {
  const totalVol = sum(rows.map((r) => r.volume))
  const wSL = totalVol ? sum(rows.map((r) => r.projSL * r.volume)) / totalVol : 0
  const under = rows.filter((r) => r.variance < 0)
  const over = rows.filter((r) => r.variance > 0)
  const peak = rows.reduce((a, r, i) => (r.volume > rows[a].volume ? i : a), 0)
  const worst = under.reduce((a, r) => (!a || r.variance < a.variance ? r : a), null)
  return { totalVol, wSL, under: under.length, over: over.length, peakLabel: rows[peak]?.label, worst }
}
