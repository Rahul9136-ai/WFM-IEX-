import { useMemo } from 'react'
import TopBar from '../components/TopBar.jsx'
import KPICard from '../components/KPICard.jsx'
import Chart from '../components/Chart.jsx'
import { useStore } from '../store.jsx'
import { QUEUES, INTERVALS } from '../data/seed.js'
import { buildPlan, summarisePlan, fmtPct } from '../lib/planning.js'

// Shrinkage breakdown that sums to the configured total.
const SHRINK_BREAKDOWN = [
  { label: 'Paid breaks', share: 0.27, color: '#5b8def' },
  { label: 'Lunch (unpaid)', share: 0.20, color: '#22b07d' },
  { label: 'Training & coaching', share: 0.18, color: '#7d5bef' },
  { label: 'Absence / sick', share: 0.20, color: '#e0556b' },
  { label: 'Off-phone / admin', share: 0.15, color: '#e0a020' },
]

export default function Reports() {
  const { forecasts, ahts, shrinkage, agents } = useStore()

  // roll up every queue
  const perQueue = useMemo(
    () => QUEUES.map((q) => {
      const plan = buildPlan(forecasts[q.id], ahts[q.id], q, shrinkage, agents)
      return { q, plan, sum: summarisePlan(plan) }
    }),
    [forecasts, ahts, shrinkage, agents]
  )

  const centre = useMemo(() => {
    const totalVol = perQueue.reduce((a, x) => a + x.sum.totalVol, 0)
    const wSL = totalVol ? perQueue.reduce((a, x) => a + x.sum.wSL * x.sum.totalVol, 0) / totalVol : 0
    const reqHours = perQueue.reduce((a, x) => a + x.sum.reqHours, 0)
    const schedHours = perQueue.reduce((a, x) => a + x.sum.schedHours, 0)
    return { totalVol, wSL, reqHours, schedHours }
  }, [perQueue])

  return (
    <>
      <TopBar title="Reports & Analytics" />
      <div className="content">
        <div className="grid cols-4">
          <KPICard label="CENTRE VOLUME" value={centre.totalVol.toLocaleString()} target="all queues, today" status="neutral" />
          <KPICard label="CENTRE SERVICE LEVEL" value={fmtPct(centre.wSL)} target="volume-weighted" status={centre.wSL >= 0.8 ? 'good' : 'warn'} />
          <KPICard label="REQUIRED AGENT-HRS" value={centre.reqHours.toFixed(0)} target="incl. shrinkage" status="neutral" />
          <KPICard label="SCHEDULE EFFICIENCY" value={fmtPct(centre.reqHours / Math.max(1, centre.schedHours))} target="required ÷ scheduled hrs" status={centre.schedHours >= centre.reqHours ? 'good' : 'bad'} />
        </div>

        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>Service level by queue</h3>
            <div className="sub">Projected, volume-weighted across the day.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {perQueue.map(({ q, sum }) => (
                <div key={q.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="state"><span className="sw" style={{ background: q.color }} />{q.name}</span>
                    <span className="tabnum">{fmtPct(sum.wSL)} <span className="muted">/ tgt {fmtPct(q.slTarget)}</span></span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.min(100, sum.wSL * 100)}%`, background: sum.wSL >= q.slTarget ? 'var(--good)' : 'var(--bad)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Shrinkage composition</h3>
            <div className="sub">What the {fmtPct(shrinkage)} shrinkage allowance is made of.</div>
            <div className="bar-track" style={{ height: 22, display: 'flex', marginTop: 12, marginBottom: 14 }}>
              {SHRINK_BREAKDOWN.map((s) => (
                <div key={s.label} title={s.label} style={{ width: `${s.share * 100}%`, background: s.color, height: '100%' }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SHRINK_BREAKDOWN.map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="state"><span className="sw" style={{ background: s.color }} />{s.label}</span>
                  <span className="tabnum muted">{fmtPct(s.share * shrinkage)} of staff</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Centre coverage — required vs scheduled (all queues)</h3>
          <Chart
            labels={INTERVALS.map((i) => i.label)}
            yLabel="agents across all queues"
            series={[
              {
                name: 'Required', color: '#e0a020', type: 'bar', opacity: 0.55,
                data: INTERVALS.map((_, i) => perQueue.reduce((a, x) => a + x.plan[i].requiredGross, 0)),
              },
              {
                name: 'Scheduled', color: '#5b8def', dots: true,
                data: INTERVALS.map((_, i) => perQueue.reduce((a, x) => a + x.plan[i].scheduled, 0)),
              },
            ]}
          />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Queue summary</h3>
          <table className="tbl">
            <thead>
              <tr><th>Queue</th><th>Volume</th><th>AHT</th><th>SL target</th><th>Proj. SL</th><th>Req. hrs</th><th>Sched. hrs</th><th>Under intervals</th></tr>
            </thead>
            <tbody>
              {perQueue.map(({ q, sum }) => (
                <tr key={q.id}>
                  <td style={{ textAlign: 'left' }}><span className="state"><span className="sw" style={{ background: q.color }} />{q.name}</span></td>
                  <td>{sum.totalVol.toLocaleString()}</td>
                  <td>{ahts[q.id]}s</td>
                  <td>{fmtPct(q.slTarget)}/{q.targetTime}s</td>
                  <td><span className={`pill ${sum.wSL >= q.slTarget ? 'good' : 'bad'}`}>{fmtPct(sum.wSL)}</span></td>
                  <td>{sum.reqHours.toFixed(0)}</td>
                  <td>{sum.schedHours.toFixed(0)}</td>
                  <td style={{ color: sum.underIntervals ? 'var(--bad)' : 'var(--good)', fontWeight: 700 }}>{sum.underIntervals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
