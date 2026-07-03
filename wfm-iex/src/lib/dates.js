// Date helpers + the app's anchored "today". The synthetic history ends on
// TODAY-1, so forward forecasts run from TODAY. Everything uses local midnight.

export const TODAY = new Date(2026, 5, 26) // app "today" (June = month 5)

const DAY_MS = 86400000
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d, n) => { const x = startOfDay(d); x.setDate(x.getDate() + n); return x }
export const dowOf = (d) => d.getDay()

// 'YYYY-MM-DD' for <input type="date"> round-tripping.
export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function parseYMD(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)

// Day-of-year (1..366) — the annual-seasonality feature for forecasting.
export function dayOfYear(d) {
  const yearStart = new Date(d.getFullYear(), 0, 0)
  return Math.floor((startOfDay(d) - yearStart) / DAY_MS)
}

// Longest range the planner will enumerate (keeps very large selections bounded).
export const MAX_RANGE_DAYS = 372

// Inclusive list of days from start → end (capped to avoid runaway tables).
export function enumerateDays(start, end, cap = MAX_RANGE_DAYS) {
  const out = []
  let cur = startOfDay(start)
  const last = startOfDay(end)
  while (cur <= last && out.length < cap) { out.push(cur); cur = addDays(cur, 1) }
  return out
}

// Training day-index for a future date, so trend-aware models extrapolate.
// History end (TODAY-1) sits at index HISTORY_DAYS-1; each later day adds one.
export function dayIndex(date, historyDays) {
  return historyDays - 1 + daysBetween(addDays(TODAY, -1), date)
}

export const fmtDay = (d) => `${DOW3[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
export const fmtShort = (d) => `${d.getDate()} ${MON[d.getMonth()]}`
export const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`
export const monthLabel = (d) => `${MON[d.getMonth()]} ${d.getFullYear()}`

// ISO-ish week key (Monday-start) + a friendly "wk of <date>" label.
export function weekStart(d) {
  const x = startOfDay(d)
  const off = (x.getDay() + 6) % 7 // days since Monday
  return addDays(x, -off)
}
export const weekKey = (d) => ymd(weekStart(d))
export const weekLabel = (d) => `wk ${fmtShort(weekStart(d))}`

export const PRESETS = [
  { id: 'today',  label: 'Today',      days: 0 },
  { id: 'week',   label: 'Next 7 days', days: 6 },
  { id: 'two',    label: 'Next 14 days', days: 13 },
  { id: 'month',  label: 'Next 30 days', days: 29 },
  { id: 'sixty',  label: 'Next 60 days', days: 59 },
  { id: 'ninety', label: 'Next 90 days', days: 89 },
]
