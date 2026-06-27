// "AI summary" generators. These are rule-based analysts: they read the real
// computed numbers for each tab and write a headline + bullet insights in plain
// language. (No LLM call — deterministic, explainable, and offline.)
import { INTERVALS } from '../data/seed.js'
import { fmtPct, fmtSec } from './planning.js'

const at = (idx) => INTERVALS[idx]?.label ?? '—'
const pct = (x) => fmtPct(x)

// ---------- Forecasting tab ----------
export function forecastInsight(queue, bt, appliedMethodId, sum) {
  const sorted = [...bt.perMethod].sort((a, b) => a.mape - b.mape)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  const applied = bt.perMethod.find((m) => m.id === appliedMethodId) ?? best
  const mlBest = sorted.find((m) => m.kind === 'ML')
  const statBest = sorted.find((m) => m.kind === 'Statistical')
  const gran = sum.gran ?? 'daily'

  const bullets = [
    `Lowest error this back-test (${gran}): ${best.name} at ${pct(best.mape)} MAPE — ${(worst.mape - best.mape > 0.1) ? `${worst.name} is the weakest (${pct(worst.mape)}), likely missing the day-of-week effect.` : `methods are tightly clustered (${pct(best.mape)}–${pct(worst.mape)}).`}`,
    `ML vs traditional: best ML model (${mlBest.name}, ${pct(mlBest.mape)}) ${mlBest.mape <= statBest.mape ? 'edges out' : 'trails'} the best statistical model (${statBest.name}, ${pct(statBest.mape)}).`,
    `Applied forecast (${applied.name}) projects ${sum.totalVol.toLocaleString()} contacts, peaking ~${sum.peakLabel}.`,
  ]
  if (applied.id !== best.id) {
    bullets.push(`⚠ You're using ${applied.name} but ${best.name} back-tests ${pct(applied.mape - best.mape)} more accurately — consider switching.`)
  } else {
    bullets.push(`✓ You're on the most accurate model — good basis for staffing.`)
  }
  return {
    headline: `${best.name} is the most accurate forecast for ${queue.name} this cycle (${pct(best.mape)} MAPE).`,
    bullets,
    tone: applied.id === best.id ? 'good' : 'warn',
  }
}

// ---------- Planning / staffing tab ----------
export function planningInsight(queue, plan, sum) {
  const under = plan.filter((p) => p.variance < 0)
  const worst = under.reduce((a, p) => (!a || p.variance < a.variance ? p : a), null)
  const over = plan.filter((p) => p.variance > 1)
  const bullets = [
    `Day service level projects ${pct(sum.wSL)} against a ${pct(queue.slTarget)} target; required ${sum.reqHours.toFixed(0)} agent-hrs vs ${sum.schedHours.toFixed(0)} scheduled.`,
    under.length
      ? `${under.length} intervals are short — worst is ${at(worst.idx)} (${worst.variance} agents, SL ~${pct(worst.projSL)}). Pull cover into the ${at(worst.idx)} block.`
      : `Every interval is covered to requirement — no staffing gaps.`,
    over.length
      ? `${over.length} intervals are over-staffed (e.g. ${at(over[0].idx)}, +${over[0].variance}); shifting some of that surplus to peaks would lift SL at no extra cost.`
      : `Little slack in the plan — limited room to reshuffle without adding heads.`,
    `Average occupancy ${pct(sum.avgOcc)} — ${sum.avgOcc > 0.9 ? 'high; agents are at burnout risk, add buffer.' : sum.avgOcc < 0.7 ? 'low; the plan has comfortable headroom.' : 'in a healthy band.'}`,
  ]
  return {
    headline: under.length
      ? `${queue.name}: ${under.length} under-staffed intervals put SL at risk around ${at(worst.idx)}.`
      : `${queue.name} is fully staffed to requirement across the day.`,
    bullets,
    tone: under.length > 6 ? 'bad' : under.length ? 'warn' : 'good',
  }
}

// ---------- Capacity planning tab (granularity-aware) ----------
export function capacityInsight(queue, rows, gran, sumB, unit) {
  const under = rows.filter((r) => r.variance < 0)
  const over = rows.filter((r) => r.variance > 0)
  const worst = sumB.worst
  const word = gran === 'daily' ? 'days' : gran === 'weekly' ? 'weeks' : 'months'
  const u = unit === 'agents' ? 'agents' : 'agent-hrs'
  const bullets = [
    `Projected service level ${pct(sumB.wSL)} vs a ${pct(queue.slTarget)} target across ${rows.length} ${word} (${sumB.totalVol.toLocaleString()} contacts).`,
    under.length
      ? `${under.length} ${word} fall short — deepest at ${worst.label} (${worst.variance} ${u}). Resource that ${word.slice(0, -1)} first.`
      : `No ${word} in range are under-resourced.`,
    over.length
      ? `${over.length} ${word} carry surplus — weekends are typically the over-staff; a weekend-specific roster would free hours.`
      : `Little slack in the plan — limited room to reshuffle.`,
    `Figures are agent-hours — divide by shift length (~8h) for FTE headcount.`,
  ]
  return {
    headline: under.length
      ? `${queue.name} (${gran}): ${under.length} ${word} under requirement, worst at ${worst.label}.`
      : `${queue.name} (${gran}): fully resourced — ${over.length ? `${over.length} ${word} hold surplus capacity.` : 'balanced plan.'}`,
    bullets,
    tone: under.length > Math.max(2, rows.length / 4) ? 'bad' : under.length ? 'warn' : 'good',
  }
}

// ---------- Scheduling tab ----------
export function scheduleInsight(agents, plan, sum) {
  const under = plan.filter((p) => p.variance < 0)
  const peakShort = under.reduce((a, p) => (!a || p.variance < a.variance ? p : a), null)
  const earlyOver = plan.slice(0, 6).reduce((a, p) => a + Math.max(0, p.variance), 0)
  const bullets = [
    `${agents.length} agents rostered for ${sum.schedHours.toFixed(0)} paid hours; the forecast needs ${sum.reqHours.toFixed(0)} — a ${sum.schedHours >= sum.reqHours ? 'surplus' : 'deficit'} of ${Math.abs(sum.schedHours - sum.reqHours).toFixed(0)} hrs.`,
    under.length
      ? `Coverage dips below requirement in ${under.length} intervals; the deepest gap is ${at(peakShort.idx)}. A mid-shift (start ~${shiftStartFor(peakShort.idx)}) would close most of it.`
      : `Shift pattern covers every interval — no schedule gaps to fill.`,
    earlyOver > 2
      ? `Early shifts are heavy (${earlyOver.toFixed(0)} surplus agent-intervals before 10:00). Sliding two early starts later would rebalance toward the peak.`
      : `Start-time distribution tracks the arrival curve well.`,
    `Tip: import a finalised roster via Excel to replace this generated schedule and re-plan instantly.`,
  ]
  return {
    headline: under.length
      ? `Roster covers ${pct(1 - under.length / plan.length)} of intervals; ${under.length} need a shift tweak around ${at(peakShort.idx)}.`
      : `Roster fully covers the forecast — well-shaped shift plan.`,
    bullets,
    tone: under.length > 6 ? 'warn' : 'good',
  }
}
function shiftStartFor(idx) {
  const mins = 7 * 60 + idx * 30 - 120 // start ~2h before the gap
  const h = Math.max(7, Math.floor(mins / 60))
  return `${String(h).padStart(2, '0')}:00`
}

// ---------- Real-time tab ----------
export function realtimeInsight(stats, recs, slAtRisk) {
  const bullets = [
    `${stats.inAdh}/${stats.total} agents in adherence (${pct(stats.adherence)}); ${stats.outAdh} are off-plan right now.`,
    `${stats.onPhone} on the phones (${stats.available} available, ${stats.acw} in ACW); ${stats.onBreak} on break/lunch, ${stats.offline} logged out.`,
    slAtRisk
      ? `⚠ Live SL is at risk — ${recs.length ? `${recs.length} agents on deferrable breaks can be recalled now.` : 'no deferrable breaks available to recall; consider overtime.'}`
      : `Service level is holding; no break recalls needed.`,
    recs.length
      ? `Recommend pulling back ${recs.slice(0, 3).map((r) => r.name.split(' ')[0]).join(', ')}${recs.length > 3 ? ` +${recs.length - 3} more` : ''} — flagged to TLs ${[...new Set(recs.map((r) => r.tl))].join(', ')}.`
      : `All scheduled breaks are within plan.`,
  ]
  return {
    headline: slAtRisk
      ? `SL at risk: ${recs.length} break recall${recs.length === 1 ? '' : 's'} recommended to recover the queue.`
      : `Floor is healthy — ${pct(stats.adherence)} adherence, ${stats.onPhone} agents on the phones.`,
    bullets,
    tone: slAtRisk ? (recs.length ? 'warn' : 'bad') : 'good',
  }
}
