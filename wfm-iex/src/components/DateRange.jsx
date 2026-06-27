import { TODAY, ymd, addDays, PRESETS } from '../lib/dates.js'

// Date-range control: quick presets + From/To pickers. Forward-only (forecast).
export default function DateRange({ start, end, onChange }) {
  const today = ymd(TODAY)
  const applyPreset = (days) => onChange(today, ymd(addDays(TODAY, days)))
  const activePreset = PRESETS.find((p) => start === today && end === ymd(addDays(TODAY, p.days)))?.id

  function setStart(v) { onChange(v, v > end ? v : end) }
  function setEnd(v) { onChange(v < start ? start : start, v < start ? start : v) }

  return (
    <div className="daterange">
      <div className="seg">
        {PRESETS.map((p) => (
          <button key={p.id} className={activePreset === p.id ? 'on' : ''} onClick={() => applyPreset(p.days)}>{p.label}</button>
        ))}
      </div>
      <div className="field">
        <label>From</label>
        <input type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="field">
        <label>To</label>
        <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
      </div>
    </div>
  )
}
