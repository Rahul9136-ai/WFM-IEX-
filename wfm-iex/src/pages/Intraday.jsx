import { useMemo } from 'react'
import TopBar from '../components/TopBar.jsx'
import KPICard from '../components/KPICard.jsx'
import Chart from '../components/Chart.jsx'
import { useStore } from '../store.jsx'
import { INTERVALS, actualsFor } from '../data/seed.js'
import { buildPlan, fmtPct } from '../lib/planning.js'

export default function Intraday() {
  const { queue, forecasts, ahts, shrinkage, nowIdx, setNowIdx, agents } = useStore()
  const volume = forecasts[queue.id]
  const aht = ahts[queue.id]
  const actuals = useMemo(() => actualsFor(queue.id, nowIdx), [queue.id, nowIdx])
  const plan = useMemo(() => buildPlan(volume, aht, queue, shrinkage, agents), [volume, aht, queue, shrinkage, agents])

  // pacing: how actuals-to-date compare to forecast-to-date
  const pacing = useMemo(() => {
    let af = 0, ff = 0
    for (let i = 0; i <= nowIdx; i++) { af += actuals[i] ?? 0; ff += volume[i] }
    return ff ? af / ff : 1
  }, [actuals, volume, nowIdx])

  // reforecast: keep actuals for elapsed intervals, scale remaining forecast by pacing
  const reforecast = useMemo(
    () => volume.map((v, i) => (i <= nowIdx ? actuals[i] : Math.round(v * pacing))),
    [volume, actuals, nowIdx, pacing]
  )

  const dayForecast = volume.reduce((a, v) => a + v, 0)
  const dayReforecast = reforecast.reduce((a, v) => a + v, 0)
  const elapsedReq = plan.slice(0, nowIdx + 1).reduce((a, p) => a + p.requiredGross, 0)
  const elapsedSched = plan.slice(0, nowIdx + 1).reduce((a, p) => a + p.scheduled, 0)

  return (
    <>
      <TopBar title="Intraday Management" />
      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="controls">
            <div className="field" style={{ flex: 1 }}>
              <label>Day clock — drag to advance “now” <span className="val">{INTERVALS[nowIdx].label}</span></label>
              <input type="range" min="0" max={INTERVALS.length - 1} value={nowIdx} style={{ width: '100%' }}
                onChange={(e) => setNowIdx(+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid cols-4">
          <KPICard label="PACING vs FORECAST" value={`${pacing >= 1 ? '+' : ''}${fmtPct(pacing - 1)}`} target="actual ÷ forecast, to-date" status={Math.abs(pacing - 1) <= 0.05 ? 'good' : Math.abs(pacing - 1) <= 0.12 ? 'warn' : 'bad'} />
          <KPICard label="ORIGINAL FORECAST" value={dayForecast.toLocaleString()} target="contacts (full day)" status="neutral" />
          <KPICard label="REFORECAST" value={dayReforecast.toLocaleString()} target="actuals + paced remainder" status={dayReforecast > dayForecast ? 'warn' : 'good'} />
          <KPICard label="COVERAGE TO-DATE" value={`${elapsedSched}/${elapsedReq}`} target="scheduled vs required agt-int" status={elapsedSched >= elapsedReq ? 'good' : 'bad'} />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>Forecast vs actual vs reforecast</h3>
            <span className="pill neutral">now: {INTERVALS[nowIdx].label}</span>
          </div>
          <Chart
            labels={INTERVALS.map((i) => i.label)}
            nowIdx={nowIdx}
            yLabel="contacts / 30-min"
            series={[
              { name: 'Original forecast', color: '#5b8def', data: volume, dashed: true },
              { name: 'Actual (to-date)', color: '#22b07d', data: actuals, dots: true, fill: true },
              { name: 'Reforecast (paced)', color: '#e0a020', data: reforecast.map((v, i) => (i > nowIdx ? v : null)), dashed: true },
            ]}
          />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Interval variance</h3>
          <div className="sub">Elapsed intervals show actual vs forecast; future intervals show the paced reforecast.</div>
          <div className="scroll" style={{ maxHeight: 360 }}>
            <table className="tbl">
              <thead>
                <tr><th>Interval</th><th>Forecast</th><th>Actual</th><th>Variance</th><th>Reforecast</th><th>Status</th></tr>
              </thead>
              <tbody>
                {INTERVALS.map((iv, i) => {
                  const past = i <= nowIdx
                  const variance = past ? (actuals[i] - volume[i]) : null
                  return (
                    <tr key={i} className={past && Math.abs(variance) / Math.max(1, volume[i]) > 0.12 ? 'row-under' : ''}>
                      <td>{iv.label}</td>
                      <td>{volume[i]}</td>
                      <td>{past ? actuals[i] : '—'}</td>
                      <td style={past ? { color: variance < 0 ? 'var(--good)' : 'var(--bad)', fontWeight: 700 } : {}}>
                        {past ? `${variance > 0 ? '+' : ''}${variance}` : '—'}
                      </td>
                      <td>{past ? '—' : reforecast[i]}</td>
                      <td>
                        {past
                          ? <span className={`pill ${Math.abs(variance) / Math.max(1, volume[i]) <= 0.12 ? 'good' : 'bad'}`}>{Math.abs(variance) / Math.max(1, volume[i]) <= 0.12 ? 'on track' : 'off plan'}</span>
                          : <span className="pill neutral">projected</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
