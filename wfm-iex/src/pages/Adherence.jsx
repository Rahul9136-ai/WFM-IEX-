import { useEffect, useMemo, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import KPICard from '../components/KPICard.jsx'
import AISummary from '../components/AISummary.jsx'
import { useStore } from '../store.jsx'
import { QUEUES, AUX, AUX_BY_CODE, inAdherence } from '../data/seed.js'
import { buildPlan, fmtPct } from '../lib/planning.js'
import { realtimeInsight } from '../lib/insights.js'

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function Adherence() {
  const { agents, rta, recallAgent, recallMany, forecasts, ahts, shrinkage, nowIdx } = useStore()
  const byId = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents])

  // live ticking clock so time-in-state advances like a real wallboard
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // simulate an unexpected volume surge (real-time pressure) so break-recovery
  // is demonstrable; when off, risk reflects the genuine current-interval plan.
  const [surge, setSurge] = useState(true)

  // which queues are under-staffed at "now"
  const underQueues = useMemo(() => QUEUES.filter((q) => {
    const plan = buildPlan(forecasts[q.id], ahts[q.id], q, shrinkage, agents)
    return plan[nowIdx].variance < 0
  }).map((q) => q.id), [forecasts, ahts, shrinkage, agents, nowIdx])

  const slAtRisk = surge || underQueues.length > 0
  const pressuredQueues = surge ? QUEUES.map((q) => q.id) : underQueues

  // join the live snapshot with agent details
  const live = useMemo(() => rta.map((r) => ({ ...r, agent: byId[r.id], aux: AUX_BY_CODE[r.actual], live: r.recalled ? tick : r.secs + tick }))
    .filter((r) => r.agent), [rta, byId, tick])

  // AI break-recovery: agents on a deferrable break who are skilled for a
  // pressured queue — recall the longest-idle first.
  const recs = useMemo(() => {
    if (!slAtRisk) return []
    return live
      .filter((r) => r.aux?.deferrable && !r.recalled)
      .filter((r) => r.agent.skills.some((s) => pressuredQueues.includes(s)))
      .sort((a, b) => b.live - a.live)
      .map((r) => ({
        id: r.id, name: r.agent.name, tl: r.agent.tl, team: r.agent.team,
        aux: r.aux.label, helps: r.agent.skills.filter((s) => pressuredQueues.includes(s)),
      }))
  }, [live, slAtRisk, pressuredQueues])

  // headline stats
  const stats = useMemo(() => {
    const total = live.length
    const inAdh = live.filter((r) => inAdherence(r.actual, r.scheduled)).length
    const cat = (c) => live.filter((r) => r.aux?.cat === c).length
    return {
      total, inAdh, outAdh: total - inAdh, adherence: total ? inAdh / total : 0,
      available: live.filter((r) => r.actual === 'AVAIL').length,
      acw: live.filter((r) => r.actual === 'ACW').length,
      onPhone: cat('productive'), onBreak: cat('break'), offline: cat('offline'),
    }
  }, [live])

  const insight = useMemo(() => realtimeInsight(stats, recs, slAtRisk), [stats, recs, slAtRisk])

  // AUX distribution for the legend/summary
  const dist = AUX.map((a) => ({ ...a, count: live.filter((r) => r.actual === a.code).length })).filter((a) => a.count)

  return (
    <>
      <TopBar title="Real-Time Monitor (RTA)" />
      <div className="content">
        <div className="grid cols-4">
          <KPICard label="ADHERENCE" value={fmtPct(stats.adherence)} target={`${stats.inAdh}/${stats.total} on plan`} status={stats.adherence >= 0.9 ? 'good' : stats.adherence >= 0.8 ? 'warn' : 'bad'} />
          <KPICard label="ON THE PHONES" value={stats.onPhone} target={`${stats.available} avail · ${stats.acw} ACW`} status="good" />
          <KPICard label="OFF-PLAN NOW" value={stats.outAdh} target="actual ≠ schedule" status={stats.outAdh === 0 ? 'good' : 'bad'} />
          <KPICard label="LIVE SL RISK" value={slAtRisk ? 'AT RISK' : 'STABLE'} target={slAtRisk ? `${pressuredQueues.length} queue(s) pressured` : 'within target'} status={slAtRisk ? 'bad' : 'good'} />
        </div>

        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <AISummary insight={insight} title="AI Real-Time Summary" />

          <div className={`card ${slAtRisk ? 'ai-summary ai-warn' : ''}`}>
            <div className="card-head">
              <h3>⚡ AI Break Recovery</h3>
              <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={surge} onChange={(e) => setSurge(e.target.checked)} /> simulate surge
              </label>
            </div>
            {!slAtRisk ? (
              <div className="muted" style={{ padding: '8px 0' }}>Service level is holding — no break recalls needed. Toggle “simulate surge” to model a spike.</div>
            ) : recs.length === 0 ? (
              <div style={{ padding: '8px 0', color: 'var(--bad)' }}>SL at risk but no deferrable breaks to recall — escalate for overtime.</div>
            ) : (
              <>
                <div className="sub">SL at risk. Recall these agents from deferrable breaks — flagged to their TL. Lunch & training are protected and excluded.</div>
                <div style={{ marginTop: 6 }}>
                  {recs.map((r) => (
                    <div className="rec-row" key={r.id}>
                      <div>
                        <div className="who">{r.name} <span className="muted" style={{ fontWeight: 400 }}>· {r.aux}</span></div>
                        <div className="why">helps {r.helps.map((h) => QUEUES.find((q) => q.id === h)?.name).join(', ')} · flag to TL <b>{r.tl}</b></div>
                      </div>
                      <button className="btn primary tlflag" onClick={() => recallAgent(r.id)}>Recall</button>
                    </div>
                  ))}
                </div>
                <button className="btn primary" style={{ marginTop: 12 }} onClick={() => recallMany(recs.map((r) => r.id))}>
                  Recall all {recs.length} & notify TLs
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>AUX state distribution</h3>
            <span className="pill neutral">{stats.total} agents</span>
          </div>
          <div className="auxleg">
            {dist.map((a) => (
              <span key={a.code}><i style={{ background: a.color }} /> {a.label} <b style={{ color: 'var(--text)', marginLeft: 2 }}>{a.count}</b></span>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>Live agent board <span className="dot-live" style={{ display: 'inline-block', marginLeft: 6 }} /></h3>
            <span className="muted" style={{ fontSize: 12 }}>time-in-state ticking live</span>
          </div>
          <div className="wall">
            {live.map((r) => {
              const off = !inAdherence(r.actual, r.scheduled)
              return (
                <div key={r.id} className={`tile ${off ? 'off' : ''} ${r.recalled ? 'recalled' : ''}`} style={{ borderLeftColor: r.aux?.color }}>
                  {off && <span className="flag">OFF-PLAN</span>}
                  {r.recalled && <span className="flag" style={{ color: 'var(--good)' }}>RECALLED</span>}
                  <div className="nm">{r.agent.name}</div>
                  <div className="meta">{r.agent.team} · {r.agent.skills.join('/')}</div>
                  <div className="auxrow">
                    <span className="auxcode"><span style={{ width: 9, height: 9, borderRadius: 2, background: r.aux?.color, display: 'inline-block' }} /> {r.aux?.code} · {r.aux?.label}</span>
                    <span className="timer">{fmtTime(r.live)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
