import { useMemo, useState, useEffect } from 'react'
import TopBar from '../components/TopBar.jsx'
import Chart from '../components/Chart.jsx'
import AISummary from '../components/AISummary.jsx'
import DateRange from '../components/DateRange.jsx'
import { useStore } from '../store.jsx'
import { INTERVALS } from '../data/seed.js'
import { historyFor } from '../data/history.js'
import { generate, methodById } from '../lib/forecast.js'
import { GRANULARITIES, backtestG, rangePlan, dayProfile, summariseBuckets } from '../lib/granularity.js'
import { buildPlan, fmtPct, fmtSec } from '../lib/planning.js'
import { forecastInsight } from '../lib/insights.js'
import { TODAY, ymd, parseYMD, fmtDay } from '../lib/dates.js'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Forecast() {
  const { queue, forecasts, setVolume, scaleForecast, ahts, setAht, shrinkage, agents, applyForecast, forecastMethod } = useStore()
  const volume = forecasts[queue.id]
  const aht = ahts[queue.id]
  const method = forecastMethod[queue.id]

  const [gran, setGran] = useState('daily')
  const [start, setStart] = useState(ymd(TODAY))
  const [end, setEnd] = useState(ymd(TODAY))
  const granObj = GRANULARITIES.find((g) => g.id === gran)
  const onRange = (s, e) => { setStart(s); setEnd(e) }

  const sd = parseYMD(start), ed = parseYMD(end)
  const singleDay = start === end
  const isToday = start === ymd(TODAY)
  const intraday = gran === 'daily' && singleDay

  const bt = useMemo(() => backtestG(queue.id, gran), [queue.id, gran])
  const hist = useMemo(() => historyFor(queue.id), [queue.id])

  const [preview, setPreview] = useState(bt.best.id)
  useEffect(() => { setPreview(bt.best.id) }, [bt.best.id])
  const previewMethod = bt.perMethod.find((m) => m.id === preview) ?? bt.best

  // intraday (single day) — editable today, else model-derived profile
  const dayVol = useMemo(
    () => (intraday ? (isToday ? volume : dayProfile(queue.id, sd, preview)) : null),
    [intraday, isToday, volume, queue.id, start, preview]
  )
  const plan = useMemo(() => (dayVol ? buildPlan(dayVol, aht, queue, shrinkage, agents) : []), [dayVol, aht, queue, shrinkage, agents])

  // multi-day / week / month — bucketed range plan
  const rp = useMemo(
    () => (intraday ? null : rangePlan(queue.id, sd, ed, gran, preview, aht, queue, shrinkage, agents)),
    [intraday, queue.id, start, end, gran, preview, aht, queue, shrinkage, agents]
  )

  const fsum = useMemo(() => {
    if (intraday) {
      const totalVol = dayVol.reduce((a, b) => a + b, 0)
      const peakIdx = dayVol.reduce((b, v, i) => (v > dayVol[b] ? i : b), 0)
      return { totalVol, peakLabel: INTERVALS[peakIdx].label, gran }
    }
    const s = summariseBuckets(rp.rows)
    return { totalVol: s.totalVol, peakLabel: s.peakLabel, gran }
  }, [intraday, dayVol, rp, gran])

  const insight = useMemo(
    () => forecastInsight(queue, bt, intraday && isToday ? method : preview, fsum),
    [queue, bt, method, preview, fsum, intraday, isToday]
  )

  function applyMethod(id) {
    setPreview(id)
    applyForecast(queue.id, generate(queue.id, id), id)
  }
  const methodLabel = methodById[method]?.name ?? (method === 'manual' ? 'Manual edits' : 'Baseline')

  return (
    <>
      <TopBar title="Forecast & Requirement" />
      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h3>Date range & granularity</h3>
              <div className="sub">
                {intraday
                  ? `${isToday ? 'Today' : fmtDay(sd)} · 30-min intervals${isToday ? ' · editable' : ''}`
                  : `${fmtDay(sd)} → ${fmtDay(ed)} · ${rp.nDays} days → ${rp.rows.length} ${rp.bucket}${rp.rows.length === 1 ? '' : 's'}${rp.truncated ? ' (capped 92d)' : ''}`}
              </div>
            </div>
            <div className="seg">
              {GRANULARITIES.map((g) => (
                <button key={g.id} className={g.id === gran ? 'on' : ''} onClick={() => setGran(g.id)}>{g.name}</button>
              ))}
            </div>
          </div>
          <DateRange start={start} end={end} onChange={onRange} />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h3>Forecasting model</h3>
            <span className="pill neutral">applied: {methodLabel}</span>
          </div>
          <div className="seg">
            {bt.perMethod.map((m) => (
              <button key={m.id} className={m.id === preview ? 'on' : ''} onClick={() => applyMethod(m.id)}>
                <span className="k">{m.kind}</span>
                {m.name}
                <span style={{ marginLeft: 6, color: m.id === bt.best.id ? 'var(--good)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(m.mape)}</span>
                {m.id === bt.best.id && <span className="badge-best">best</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid cols-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>Back-test — {previewMethod.name}</h3>
              <span className={`pill ${previewMethod.id === bt.best.id ? 'good' : 'warn'}`}>MAPE {fmtPct(previewMethod.mape)}</span>
            </div>
            <div className="sub">Prediction vs held-out actual ({bt.unit}). Lower MAPE = a tighter fit.</div>
            <Chart
              labels={bt.labels}
              yLabel={bt.unit}
              series={[
                { name: 'Actual (held-out)', color: '#22b07d', data: bt.actual, dots: true },
                { name: `${previewMethod.name}`, color: '#5b8def', data: previewMethod.pred, dashed: true },
              ]}
            />
          </div>
          <AISummary insight={insight} title="AI Forecast Summary" />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="controls">
            <div className="field">
              <label>Average Handle Time (AHT)</label>
              <input type="range" min="120" max="600" step="10" value={aht} onChange={(e) => setAht(queue.id, +e.target.value)} />
              <span className="val">{aht}s</span>
            </div>
            <div className="field">
              <label>What-if volume</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => scaleForecast(queue.id, 1.1)}>+10%</button>
                <button className="btn" onClick={() => scaleForecast(queue.id, 0.9)}>−10%</button>
              </div>
            </div>
            <div className="field"><label>SL target</label><span className="val">{fmtPct(queue.slTarget)} in {queue.targetTime}s</span></div>
            <div className="field"><label>Range forecast</label><span className="val">{fsum.totalVol.toLocaleString()} contacts</span></div>
            <div className="field"><label>Peak {intraday ? 'interval' : rp.bucket}</label><span className="val">{fsum.peakLabel}</span></div>
          </div>
        </div>

        {intraday ? (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>{isToday ? 'Applied forecast' : `Forecast — ${fmtDay(sd)}`} & requirement</h3>
              <div className="sub">{isToday ? 'Edit any interval below to override the model — staffing recomputes live via Erlang C.' : 'Model-derived profile for the selected date.'}</div>
              <Chart
                labels={INTERVALS.map((i) => i.label)}
                yLabel="contacts (line) · required agents (bars)"
                series={[
                  { name: 'Required agents', color: '#e0a020', data: plan.map((p) => p.requiredGross), type: 'bar', opacity: 0.55 },
                  { name: 'Forecast volume', color: '#5b8def', data: dayVol, dots: true },
                ]}
              />
            </div>

            <div className="card">
              <h3>Interval detail</h3>
              <div className="sub">Required = productive agents grossed up {fmtPct(shrinkage)} for shrinkage.{isToday ? ' Editable volume in blue.' : ''}</div>
              <div className="scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Interval</th><th>Volume</th><th>Erlangs</th><th>Req. (net)</th>
                      <th>Req. (gross)</th><th>Scheduled</th><th>Var.</th><th>Proj. SL</th><th>ASA</th><th>Occ.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.map((p) => (
                      <tr key={p.idx} className={p.variance < 0 ? 'row-under' : ''}>
                        <td>{p.label}</td>
                        <td className={isToday ? 'edit' : ''}>
                          {isToday
                            ? <input className="cell" type="number" value={p.volume} onChange={(e) => setVolume(queue.id, p.idx, +e.target.value)} />
                            : p.volume}
                        </td>
                        <td>{p.intensity.toFixed(1)}</td>
                        <td>{p.requiredNet}</td>
                        <td>{p.requiredGross}</td>
                        <td>{p.scheduled}</td>
                        <td style={{ color: p.variance < 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 700 }}>{p.variance > 0 ? '+' : ''}{p.variance}</td>
                        <td>{fmtPct(p.projSL)}</td>
                        <td>{fmtSec(p.asa)}</td>
                        <td>{fmtPct(p.occupancy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Forecast volume by {rp.bucket}</h3>
              <div className="sub">Forecast contacts per {rp.bucket} across the range ({previewMethod.name}).</div>
              <Chart
                labels={rp.rows.map((r) => r.label)}
                yLabel={`contacts / ${rp.bucket}`}
                series={[{ name: 'Forecast volume', color: '#5b8def', data: rp.rows.map((r) => r.volume), type: 'bar', opacity: 0.7 }]}
              />
            </div>

            <div className="card">
              <h3>Range detail</h3>
              <div className="sub">Requirement and coverage in agent-hours (Erlang C per interval, summed across each {rp.bucket}).</div>
              <div className="scroll" style={{ maxHeight: 420 }}>
                <table className="tbl">
                  <thead>
                    <tr><th>{rp.bucket === 'day' ? 'Day' : rp.bucket === 'week' ? 'Week' : 'Month'}</th><th>Volume</th><th>Req. (agent-hrs)</th><th>Scheduled (agent-hrs)</th><th>Var.</th><th>Proj. SL</th></tr>
                  </thead>
                  <tbody>
                    {rp.rows.map((r) => (
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
            </div>
          </>
        )}
      </div>
    </>
  )
}
