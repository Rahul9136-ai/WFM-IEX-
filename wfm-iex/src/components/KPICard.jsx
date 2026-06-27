export default function KPICard({ label, value, target, delta, status }) {
  const cls = status === 'good' ? 'good' : status === 'warn' ? 'warn' : status === 'bad' ? 'bad' : 'neutral'
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status && <span className={`pill ${cls}`}>{status === 'good' ? '✓ on target' : status === 'warn' ? '⚠ watch' : status === 'bad' ? '✕ at risk' : ''}</span>}
        {delta != null && <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}</span>}
        {target && <span className="target">{target}</span>}
      </div>
    </div>
  )
}
