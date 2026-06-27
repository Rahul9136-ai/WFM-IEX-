// Mock contact-center data for the WFM prototype.
// One business day modelled at 30-minute intervals, 07:00–19:00 = 24 intervals.

export const QUEUES = [
  { id: 'sales',   name: 'Sales',          color: '#5b8def', slTarget: 0.80, targetTime: 20, aht: 280 },
  { id: 'support', name: 'Tech Support',   color: '#22b07d', slTarget: 0.80, targetTime: 30, aht: 410 },
  { id: 'billing', name: 'Billing & Care', color: '#e0a020', slTarget: 0.85, targetTime: 20, aht: 240 },
]

// 24 half-hour intervals, 07:00 → 19:00.
export const INTERVALS = Array.from({ length: 24 }, (_, i) => {
  const mins = 7 * 60 + i * 30
  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return { idx: i, label: `${hh}:${mm}` }
})

// A double-humped daily arrival shape (morning + afternoon peaks), 0..1.
export const SHAPE = [
  0.22, 0.35, 0.52, 0.70, 0.86, 0.95, 1.00, 0.92, // 07:00–10:30
  0.80, 0.72, 0.78, 0.85, 0.70, 0.58, 0.62, 0.74, // 11:00–14:30
  0.88, 0.96, 0.90, 0.78, 0.60, 0.44, 0.30, 0.20, // 15:00–18:30
]

export const PEAKS = { sales: 44, support: 28, billing: 42 }

// Baseline forecast volume per queue per interval (used as the initial "applied"
// forecast before the user generates one with a statistical/ML method).
export function forecastFor(queueId) {
  const peak = PEAKS[queueId] ?? 40
  return SHAPE.map((s, i) => {
    const jitter = 0.9 + ((i * 7 + queueId.length) % 5) * 0.04
    return Math.round(peak * s * jitter)
  })
}

// "Actuals so far" for intraday — real arrivals that drift from forecast,
// only populated up to the current interval pointer.
export function actualsFor(queueId, upTo) {
  const fc = forecastFor(queueId)
  return fc.map((v, i) => {
    if (i > upTo) return null
    const drift = 1 + Math.sin(i * 1.3 + queueId.length) * 0.12 + (i > 12 ? 0.06 : -0.03)
    return Math.max(0, Math.round(v * drift))
  })
}

export const SHRINKAGE = 0.25 // 25% — breaks, training, absence, off-phone work

// Team leaders — used so RTA exceptions can be escalated to the right TL.
export const TEAMS = {
  Alpha:   { tl: 'Marcus Webb' },
  Bravo:   { tl: 'Elena Faro' },
  Charlie: { tl: 'Sam Okoye' },
}

// ---- Verint/Avaya-style AUX (reason) codes ------------------------------------
// cat: productive = on the phones; break/shrink = off-phone; offline = logged out.
// deferrable = a TL could legitimately pull the agent back early if SL is at risk.
export const AUX = [
  { code: 'AVAIL',   label: 'Available',       color: '#22b07d', cat: 'productive' },
  { code: 'ACW',     label: 'After-Call Work', color: '#5b8def', cat: 'productive' },
  { code: 'AUX1',    label: 'Break',           color: '#e0a020', cat: 'break',  deferrable: true },
  { code: 'AUX2',    label: 'Lunch',           color: '#e07a20', cat: 'break',  deferrable: false },
  { code: 'AUX3',    label: 'Team Meeting',    color: '#7d5bef', cat: 'shrink', deferrable: true },
  { code: 'AUX4',    label: 'Training',        color: '#9b6bff', cat: 'shrink', deferrable: false },
  { code: 'AUX5',    label: 'Coaching',        color: '#c25fb0', cat: 'shrink', deferrable: true },
  { code: 'OFFLINE', label: 'Logged Out',      color: '#e0556b', cat: 'offline' },
]
export const AUX_BY_CODE = Object.fromEntries(AUX.map((a) => [a.code, a]))

// Two productive codes count as "on plan" against each other.
export function inAdherence(actualCode, schedCode) {
  if (actualCode === schedCode) return true
  const a = AUX_BY_CODE[actualCode], s = AUX_BY_CODE[schedCode]
  return a?.cat === 'productive' && s?.cat === 'productive'
}

// ---- Roster generation --------------------------------------------------------
const FIRST = ['Ava', 'Liam', 'Noah', 'Mia', 'Ethan', 'Sofia', 'Omar', 'Grace', 'Lucas', 'Priya',
  'Daniel', 'Hana', 'Isla', 'Mateo', 'Zara', 'Kai', 'Nina', 'Theo', 'Aria', 'Reza',
  'Yara', 'Finn', 'Leah', 'Arjun', 'Cleo', 'Sven', 'Maya', 'Ivan', 'Tess', 'Diego']
const LAST = ['Mendez', 'Carter', 'Patel', 'Chen', 'Brooks', 'Rossi', 'Haddad', 'Kim', 'Müller', 'Nair',
  'Okafor', 'Sato', 'Novak', 'Reyes', 'Khan', 'Berg', 'Lopez', 'Ali', 'Costa', 'Singh',
  'Park', 'Ahmed', 'Webb', 'Mehta', 'Dubois', 'Cruz', 'Holt', 'Ivanov', 'Frost', 'Gomez']

const ROSTER_PLAN = [
  { shift: '07:00–15:30', n: 8, team: 'Alpha' },
  { shift: '08:00–16:30', n: 6, team: 'Alpha' },
  { shift: '09:30–18:00', n: 8, team: 'Bravo' },
  { shift: '10:30–19:00', n: 8, team: 'Charlie' },
]
const SKILL_CYCLE = [
  ['sales', 'billing'], ['support', 'sales'], ['billing', 'support'],
  ['sales', 'support'], ['support', 'billing'], ['billing', 'sales'],
  ['sales'], ['support'], ['billing'], ['sales', 'support'],
]

export function makeAgents() {
  const out = []
  let i = 0
  ROSTER_PLAN.forEach((block) => {
    for (let k = 0; k < block.n; k++, i++) {
      out.push({
        id: 'a' + String(i + 1).padStart(2, '0'),
        name: `${FIRST[i]} ${LAST[i]}`,
        skills: SKILL_CYCLE[i % SKILL_CYCLE.length],
        shift: block.shift,
        team: block.team,
        tl: TEAMS[block.team].tl,
      })
    }
  })
  return out
}

export const AGENTS = makeAgents()

// ---- Live real-time snapshot --------------------------------------------------
// Each agent has a scheduled AUX (what the plan says) and an actual AUX (what
// they're doing now), plus seconds-in-state. A deterministic minority are off
// plan so adherence and the AUX wallboard are meaningful.
export function makeRTA(agents) {
  return agents.map((a, i) => {
    const sched =
      i % 11 === 4 ? 'AUX1' :   // scheduled break
      i % 13 === 6 ? 'AUX2' :   // scheduled lunch
      i % 17 === 9 ? 'AUX4' :   // scheduled training
      i % 19 === 7 ? 'AUX3' :   // scheduled meeting
      i % 7 === 3  ? 'ACW' : 'AVAIL'

    // pick the actual aux — mostly matches schedule, with deterministic exceptions
    let actual = sched
    const r = i % 10
    if (sched === 'AVAIL') {
      if (r === 2) actual = 'AUX1'        // slipped onto a break (off plan)
      else if (r === 5) actual = 'OFFLINE'// unexpectedly logged out (off plan)
      else if (r === 8) actual = 'AUX5'   // pulled into coaching (off plan)
      else if (r === 3) actual = 'ACW'    // still productive (on plan)
    }
    const secs = ((i * 53 + 17) % 1100) + 40
    return { id: a.id, actual, scheduled: sched, secs }
  })
}

export const RTA = makeRTA(AGENTS)

// Kept for backward-compat with earlier code paths.
export const ADHERENCE_STATES = AUX.map((a) => a.label)
