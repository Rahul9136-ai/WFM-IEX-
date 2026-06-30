// Date helpers + the app's anchored "today". History ends TODAY-1.
export const TODAY = new Date(2026, 5, 26) // June = month 5

const DAY_MS = 86400000
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DOW3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => {
  const x = startOfDay(d)
  x.setDate(x.getDate() + n)
  return x
}
export const dowOf = (d: Date) => d.getDay()

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)

// Day-of-year (1..366) — used as the annual-seasonality feature for forecasting.
export function dayOfYear(d: Date): number {
  const yearStart = new Date(d.getFullYear(), 0, 0)
  return Math.floor((startOfDay(d).getTime() - yearStart.getTime()) / DAY_MS)
}

export function enumerateDays(start: Date, end: Date, cap = 92): Date[] {
  const out: Date[] = []
  let cur = startOfDay(start)
  const last = startOfDay(end)
  while (cur <= last && out.length < cap) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export function dayIndex(date: Date, historyDays: number): number {
  return historyDays - 1 + daysBetween(addDays(TODAY, -1), date)
}

export const fmtDay = (d: Date) => `${DOW3[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
export const fmtShort = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]}`
export const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
export const monthLabel = (d: Date) => `${MON[d.getMonth()]} ${d.getFullYear()}`

export function weekStart(d: Date): Date {
  const x = startOfDay(d)
  const off = (x.getDay() + 6) % 7
  return addDays(x, -off)
}
export const weekKey = (d: Date) => ymd(weekStart(d))
export const weekLabel = (d: Date) => `wk ${fmtShort(weekStart(d))}`

export const PRESETS = [
  { id: "today", label: "Today", days: 0 },
  { id: "week", label: "Next 7 days", days: 6 },
  { id: "two", label: "Next 14 days", days: 13 },
  { id: "month", label: "Next 30 days", days: 29 },
]
