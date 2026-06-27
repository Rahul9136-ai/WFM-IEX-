import { INTERVALS, AGENTS as DEFAULT_AGENTS } from '../data/seed.js'
import { intervalStaffing, applyShrinkage, serviceLevel, trafficIntensity } from './erlang.js'

// Parse "07:00–15:30" into interval indices covered within the 07:00 service window.
function shiftToIdx(shift) {
  const [start, end] = shift.split('–').map((t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  })
  const out = []
  INTERVALS.forEach(({ idx, label }) => {
    const [h, m] = label.split(':').map(Number)
    const mins = h * 60 + m
    if (mins >= start && mins < end) out.push(idx)
  })
  return out
}

// How many scheduled (productive) agents cover each interval for a queue,
// based on the roster shifts + skills. Pass a roster (e.g. an Excel-imported
// one); defaults to the seeded roster.
export function scheduledCoverage(queueId, agents = DEFAULT_AGENTS) {
  const cover = INTERVALS.map(() => 0)
  agents.forEach((a) => {
    if (!a.skills.includes(queueId)) return
    shiftToIdx(a.shift).forEach((idx) => { cover[idx] += 1 })
  })
  return cover
}

// Build a full interval-by-interval plan for one queue.
export function buildPlan(volume, aht, queue, shrinkage, agents = DEFAULT_AGENTS) {
  const opts = { interval: 1800, slTarget: queue.slTarget, targetTime: queue.targetTime }
  const scheduled = scheduledCoverage(queue.id, agents)

  return INTERVALS.map((iv, i) => {
    const v = volume[i]
    const s = intervalStaffing(v, aht, opts)
    const requiredNet = s.required                       // productive agents needed
    const requiredGross = applyShrinkage(requiredNet, shrinkage) // grossed up for shrinkage
    const sched = scheduled[i]
    const intensity = trafficIntensity(v, aht, 1800)
    // projected SL given the agents we actually have scheduled (net of shrinkage)
    const schedNet = Math.round(sched * (1 - shrinkage))
    const projSL = serviceLevel(schedNet, intensity, aht, queue.targetTime)
    return {
      idx: i,
      label: iv.label,
      volume: v,
      intensity,
      requiredNet,
      requiredGross,
      scheduled: sched,
      variance: sched - requiredGross, // + over-staffed, - under-staffed
      targetSL: s.serviceLevel,        // SL if perfectly staffed to requirement
      projSL,                          // SL with current schedule
      asa: s.asa,
      occupancy: s.occupancy,
    }
  })
}

// Roll a plan up to day-level summary numbers.
export function summarisePlan(plan) {
  const totalVol = plan.reduce((a, p) => a + p.volume, 0)
  // volume-weighted projected service level
  const wSL = totalVol ? plan.reduce((a, p) => a + p.projSL * p.volume, 0) / totalVol : 0
  const reqHours = plan.reduce((a, p) => a + p.requiredGross, 0) * 0.5
  const schedHours = plan.reduce((a, p) => a + p.scheduled, 0) * 0.5
  const underIntervals = plan.filter((p) => p.variance < 0).length
  const avgOcc = plan.length ? plan.reduce((a, p) => a + p.occupancy, 0) / plan.length : 0
  const peakIdx = plan.reduce((best, p, i) => (p.volume > plan[best].volume ? i : best), 0)
  return { totalVol, wSL, reqHours, schedHours, underIntervals, avgOcc, peakIdx }
}

export const fmtPct = (x) => `${(x * 100).toFixed(1)}%`
export const fmtSec = (x) => (x === Infinity || isNaN(x) ? '—' : `${Math.round(x)}s`)
