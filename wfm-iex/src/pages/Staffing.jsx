import { useMemo, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import KPICard from '../components/KPICard.jsx'
import AISummary from '../components/AISummary.jsx'
import { useStore } from '../store.jsx'
import {
  trafficIntensity, requiredAgents, serviceLevel, asa, occupancy, applyShrinkage,
} from '../lib/erlang.js'
import Chart from '../components/Chart.jsx'
import DateRange from '../components/DateRange.jsx'
import { fmtPct, fmtSec } from '../lib/planning.js'
import { capacityInsight } from '../lib/insights.js'
import { GRANULARITIES, backtestG, rangePlan, summariseBuckets } from '../lib/granularity.js'
import { methodById } from '../lib/forecast.js'
import { TODAY, ymd, addDays, parseYMD, fmtDay } from '../lib/dates.js'

export default function Staffing() {
  const { queue, shrinkage, setShrinkage, forecasts, ahts, agents: roster, forecastMethod } = useStore()

  // ---- date-range + granularity capacity plan ----
  const [gran, setGran] = useState('daily')
  const [start, setStart] = useState(ymd(TODAY))
  const [end, setEnd] = useState(ymd(addDays(TODAY, 6))) // default: next 7 days
  const granObj = GRANULARITIES.find((g) => g.id === gran)
  const onRange = (s, e) => { setStart(s); setEnd(e) }
  // use the applied forecast method where it's a real model, else the most accurate
  const planMethod = useMemo(() => {
    const sm = forecastMethod[queue.id]
    return methodById[sm] ? sm : backtestG(queue.id, gran).best.id
  }, [forecastMethod, queue.id, gran])
  const cap = useMemo(
    () => rangePlan(queue.id, parseYMD(start), parseYMD(end), gran, planMethod, ahts[queue.id], queue, shrinkage, roster),
    [queue.id, start, end, gran, planMethod, ahts, queue, shrinkage, roster]
  )
  const capSum = useMemo(() => summariseBuckets(cap.rows), [cap])
  const insight = useMemo(() => capacityInsight(queue, cap.rows, gran, capSum, cap.unit), [queue, cap, gran, capSum])

  const [volume, setVol] = useState(140)   // contacts in the interval
  const [aht, setAht] = useState(queue.aht)
  const [slTarget, setSlTarget] = useState(Math.round(queue.slTarget * 100))
  const [targetTime, setTargetTime] = useState(queue.targetTime)

  const opts = { interval: 1800, slTarget: slTarget / 100, targetTime }
  const intensity = useMemo(() => trafficIntensity(volume, aht, 1800), [volume, aht])
  const reqNet = useMemo(() => requiredAgents(volume, aht, opts), [volume, aht, slTarget, targetTime])
  const reqGross = applyShrinkage(reqNet, shrinkage)

  // sensitivity: SL / ASA / occupancy across a band of agent counts
  const band = useMemo(() => {
    const start = Math.max(1, reqNet - 4)
    return Array.from({ length: 10 }, (_, k) => start + k).map((agents) => ({
      agents,
      sl: serviceLevel(agents, intensity, aht, targetTime),
      asa: asa(agents, intensity, aht),
      occ: occupancy(agents, intensity),
      meets: serviceLevel(agents, intensity, aht, targetTime) >= slTarget / 100,
    }))
  }, [reqNet, intensity, aht, targetTime, slTarget])

  return (
    <>
      <TopBar title="Capacity Planning — Erlang C" />
      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h3>Capacity plan</h3>
              <div className="sub">{fmtDay(parseYMD(start))} → {fmtDay(parseYMD(end))} · {cap.nDays} days → {cap.rows.length} {cap.bucket}{cap.rows.length === 1 ? '' : 's'} · required vs scheduled {cap.unit}.</div>
            </div>
            <div className="seg">
              {GRANULARITIES.map((g) => (
                <button key={g.id} className={g.id === gran ? 'on' : ''} onClick={() => setGran(g.id)}>{g.name}</button>
              ))}
            </div>
          </div>
          <DateRange start={start} end={end} onChange={onRange} />
          <div style={{ height: 14 }} />
          <Chart
            labels={cap.rows.map((r) => r.label)}
            yLabel={cap.unit}
            series={[
              { name: `Required (${cap.unit})`, color: '#e0a020', data: cap.rows.map((r) => r.required), type: 'bar', opacity: 0.55 },
              { name: `Scheduled (${cap.unit})`, color: '#5b8def', data: cap.rows.map((r) => r.scheduled), dots: true },
            ]}
          />
        </div>

        <div className="grid cols-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <h3>{granObj.name} requirement</h3>
            <div className="scroll" style={{ maxHeight: 360 }}>
              <table className="tbl">
                <thead>
                  <tr><th>{cap.bucket === 'day' ? 'Day' : cap.bucket === 'week' ? 'Week' : 'Month'}</th><th>Volume</th><th>Required</th><th>Scheduled</th><th>Var.</th><th>Proj. SL</th></tr>
                </thead>
                <tbody>
                  {cap.rows.map((r) => (
                    <tr key={r.label} className={r.variance < 0 ? 'row-under' : ''}>
                      <td>{r.label}</td>
                      <td>{r.volume.toLocaleString()}</td>
                      <td>{r.required.toLocaleString()}</td>
                      <td>{r.scheduled.toLocaleString()}</td>
                      <td style={{ color: r.variance < 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 700 }}>{r.variance > 0 ? '+' : ''}{r.variance.toLocaleString()}</td>
                      <td>{fmtPct(r.projSL)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              {cap.unit === 'agents' ? 'Concurrent agents per 30-min interval.' : 'Agent-hours — divide by ~8h shift for FTE headcount.'}
            </div>
          </div>
          <AISummary insight={insight} title="AI Planning Summary" />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Single-interval staffing model</h3>
          <div className="sub">The classic WFM calculation: offered load → required agents to hit a service-level target. 30-minute interval.</div>
          <div className="controls" style={{ marginTop: 14 }}>
            <div className="field">
              <label>Contacts / interval <span className="val">{volume}</span></label>
              <input type="range" min="5" max="400" step="5" value={volume} onChange={(e) => setVol(+e.target.value)} />
            </div>
            <div className="field">
              <label>AHT <span className="val">{aht}s</span></label>
              <input type="range" min="60" max="700" step="10" value={aht} onChange={(e) => setAht(+e.target.value)} />
            </div>
            <div className="field">
              <label>SL target <span className="val">{slTarget}%</span></label>
              <input type="range" min="50" max="99" step="1" value={slTarget} onChange={(e) => setSlTarget(+e.target.value)} />
            </div>
            <div className="field">
              <label>Within <span className="val">{targetTime}s</span></label>
              <input type="range" min="5" max="120" step="5" value={targetTime} onChange={(e) => setTargetTime(+e.target.value)} />
            </div>
            <div className="field">
              <label>Shrinkage <span className="val">{fmtPct(shrinkage)}</span></label>
              <input type="range" min="0" max="0.5" step="0.01" value={shrinkage} onChange={(e) => setShrinkage(+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid cols-4">
          <KPICard label="OFFERED LOAD" value={`${intensity.toFixed(1)} Erlangs`} target={`${volume} × ${aht}s ÷ 1800s`} status="neutral" />
          <KPICard label="REQUIRED (productive)" value={reqNet} target={`to hit ${slTarget}/${targetTime}`} status="neutral" />
          <KPICard label="REQUIRED (rostered)" value={reqGross} target={`+${fmtPct(shrinkage)} shrinkage`} status="warn" />
          <KPICard label="ACHIEVED SL" value={fmtPct(serviceLevel(reqNet, intensity, aht, targetTime))} target={`ASA ${fmtSec(asa(reqNet, intensity, aht))}`} status="good" />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Sensitivity — what each staffing level buys you</h3>
          <div className="sub">How service level, ASA and occupancy move as you add or remove agents. Highlighted row = recommended.</div>
          <table className="tbl">
            <thead>
              <tr><th>Agents (net)</th><th>Service Level</th><th>ASA</th><th>Occupancy</th><th>Meets target?</th></tr>
            </thead>
            <tbody>
              {band.map((r) => (
                <tr key={r.agents} style={r.agents === reqNet ? { background: 'rgba(91,141,239,.12)', fontWeight: 700 } : {}}>
                  <td>{r.agents}{r.agents === reqNet ? '  ◄ recommended' : ''}</td>
                  <td>{fmtPct(r.sl)}</td>
                  <td>{fmtSec(r.asa)}</td>
                  <td>{fmtPct(r.occ)}</td>
                  <td>
                    <span className={`pill ${r.meets ? 'good' : 'bad'}`}>{r.meets ? '✓ yes' : '✕ no'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
