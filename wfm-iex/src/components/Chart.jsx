// Lightweight dependency-free SVG chart: line and/or stepped bar series.
export default function Chart({ labels, series, height = 240, nowIdx = null, yLabel }) {
  const W = 760, H = height
  const padL = 40, padR = 12, padT = 14, padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = labels.length

  const allVals = series.flatMap((s) => s.data.filter((v) => v != null))
  const maxV = Math.max(1, ...allVals) * 1.1
  const x = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW)
  const y = (v) => padT + innerH - (v / maxV) * innerH
  const bw = innerW / n * 0.6

  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxV / yTicks) * i))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img">
        {/* gridlines + y labels */}
        {ticks.map((t, i) => {
          const yy = y(t)
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#2a3550" strokeWidth="1" />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#8b97b3">{t}</text>
            </g>
          )
        })}

        {/* now marker */}
        {nowIdx != null && (
          <line x1={x(nowIdx)} x2={x(nowIdx)} y1={padT} y2={padT + innerH} stroke="#5b8def" strokeDasharray="4 4" strokeWidth="1.4" />
        )}

        {/* series */}
        {series.map((s, si) => {
          if (s.type === 'bar') {
            return s.data.map((v, i) =>
              v == null ? null : (
                <rect key={si + '-' + i} x={x(i) - bw / 2} y={y(v)} width={bw} height={padT + innerH - y(v)}
                  fill={s.color} opacity={s.opacity ?? 0.85} rx="2" />
              )
            )
          }
          // line (skip null gaps)
          const pts = s.data.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean)
          const d = pts.length ? 'M' + pts.join(' L ') : ''
          return (
            <g key={si}>
              {s.fill && d && (
                <path d={`${d} L ${x(s.data.findLastIndex((v) => v != null))},${y(0)} L ${x(s.data.findIndex((v) => v != null))},${y(0)} Z`}
                  fill={s.color} opacity="0.08" />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth={s.width ?? 2}
                strokeDasharray={s.dashed ? '5 4' : '0'} strokeLinejoin="round" strokeLinecap="round" />
              {s.dots && s.data.map((v, i) => v == null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill={s.color} />
              ))}
            </g>
          )
        })}

        {/* x labels (every other) */}
        {labels.map((l, i) =>
          i % 2 === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#8b97b3">{l}</text>
          ) : null
        )}
      </svg>
      <div className="legend">
        {yLabel && <span className="muted" style={{ marginRight: 8 }}>{yLabel}</span>}
        {series.map((s, i) => (
          <span key={i}><i style={{ background: s.color, height: s.type === 'bar' ? 8 : 3 }} /> {s.name}</span>
        ))}
      </div>
    </div>
  )
}
