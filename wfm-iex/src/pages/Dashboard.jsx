import { useMemo } from 'react'
import TopBar from '../components/TopBar.jsx'
import KPICard from '../components/KPICard.jsx'
import Chart from '../components/Chart.jsx'
import { useStore } from '../store.jsx'
import { INTERVALS, actualsFor, inAdherence } from '../data/seed.js'
import { buildPlan, summarisePlan, fmtPct, fmtSec } from '../lib/planning.js'

export default function Dashboard() {
  const { queue, forecasts, ahts, shrinkage, nowIdx, agents, rta } = useStore()
  const volume = forecasts[queue.id]
  const aht = ahts[queue.id]

  const plan = useMemo(() => buildPlan(volume, aht, queue, shrinkage, agents), [volume, aht, queue, shrinkage, agents])
  const sum = useMemo(() => summarisePlan(plan), [plan])
  const actuals = useMemo(() => actualsFor(queue.id, nowIdx), [queue.id, nowIdx])

  // forecast accuracy (MAPE) over the elapsed intervals
  const mape = useMemo(() => {
    let s = 0, c = 0
    for (let i = 0; i <= nowIdx; i++) {
      if (actuals[i] != null && volume[i] > 0) { s += Math.abs(actuals[i] - volume[i]) / volume[i]; c++ }
    }
    return c ? s / c : 0
  }, [actuals, volume, nowIdx])

  // adherence right now (all queues — it's a centre-wide metric)
  const adhCount = rta.filter((r) => inAdherence(r.actual, r.scheduled)).length
  const adherence = rta.length ? adhCount / rta.length : 0

  const now = plan[nowIdx]
  const slStatus = now.projSL >= queue.slTarget ? 'good' : now.projSL >= queue.slTarget - 0.1 ? 'warn' : 'bad'

  return (
    <>
      <TopBar title="Operations Dashboard" />
      <div className="content">
        <div className="banner">
          <span>📋</span>
          <span>
            <b>{queue.name}</b> — {sum.totalVol.toLocaleString()} forecast contacts today · {sum.reqHours.toFixed(0)} required agent-hrs vs {sum.schedHours.toFixed(0)} scheduled ·{' '}
            {sum.underIntervals > 0
              ? <b style={{ color: 'var(--bad)' }}>{sum.underIntervals} intervals under-staffed</b>
              : <b style={{ color: 'var(--good)' }}>fully covered</b>}
          </span>
        </div>

        <div className="grid cols-4">
          <KPICard label="SERVICE LEVEL (proj.)" value={fmtPct(now.projSL)} target={`target ${fmtPct(queue.slTarget)} in ${queue.targetTime}s`} status={slStatus} />
          <KPICard label="ASA (current interval)" value={fmtSec(now.asa)} target="avg speed of answer" status={now.asa <= queue.targetTime ? 'good' : 'warn'} />
          <KPICard label="OCCUPANCY" value={fmtPct(now.occupancy)} target="agent utilisation" status={now.occupancy <= 0.9 ? 'good' : 'warn'} />
          <KPICard label="ADHERENCE (centre)" value={fmtPct(adherence)} target={`${adhCount}/${rta.length} agents on plan`} status={adherence >= 0.9 ? 'good' : adherence >= 0.8 ? 'warn' : 'bad'} />
        </div>

        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>Intraday volume — forecast vs actual</h3>
              <span className="pill neutral">MAPE {fmtPct(mape)}</span>
            </div>
            <Chart
              labels={INTERVALS.map((i) => i.label)}
              nowIdx={nowIdx}
              yLabel="contacts / 30-min"
              series={[
                { name: 'Forecast', color: '#5b8def', data: volume, dashed: true },
                { name: 'Actual', color: '#22b07d', data: actuals, dots: true },
              ]}
            />
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Staffing — required vs scheduled</h3>
              <span className={`pill ${sum.underIntervals ? 'bad' : 'good'}`}>{sum.underIntervals} gaps</span>
            </div>
            <Chart
              labels={INTERVALS.map((i) => i.label)}
              nowIdx={nowIdx}
              yLabel="agents (incl. shrinkage)"
              series={[
                { name: 'Required', color: '#e0a020', data: plan.map((p) => p.requiredGross), type: 'bar', opacity: 0.6 },
                { name: 'Scheduled', color: '#5b8def', data: plan.map((p) => p.scheduled), dots: true },
              ]}
            />
          </div>
        </div>

        <div className="grid cols-3" style={{ marginTop: 16 }}>
          <KPICard label="FORECAST VOLUME" value={sum.totalVol.toLocaleString()} target="contacts today" status="neutral" />
          <KPICard label="REQUIRED AGENT-HRS" value={sum.reqHours.toFixed(0)} target={`${fmtPct(shrinkage)} shrinkage applied`} status="neutral" />
          <KPICard label="DAY SERVICE LEVEL" value={fmtPct(sum.wSL)} target="volume-weighted, projected" status={sum.wSL >= queue.slTarget ? 'good' : 'warn'} />
        </div>
      </div>
    </>
  )
}
