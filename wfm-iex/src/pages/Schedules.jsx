import { useMemo, useRef, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import AISummary from '../components/AISummary.jsx'
import { useStore } from '../store.jsx'
import { INTERVALS, QUEUES, makeAgents } from '../data/seed.js'
import { buildPlan, summarisePlan, fmtPct } from '../lib/planning.js'
import { scheduleInsight } from '../lib/insights.js'
import { parseScheduleFile, downloadTemplate } from '../lib/schedule.js'

function coveredIdx(shift) {
  const [s, e] = shift.split('–').map((t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m })
  return INTERVALS.map(({ label }) => {
    const [h, m] = label.split(':').map(Number); const mins = h * 60 + m
    return mins >= s && mins < e
  })
}

export default function Schedules() {
  const { queue, forecasts, ahts, shrinkage, agents, setAgents } = useStore()
  const fileRef = useRef(null)
  const [importMsg, setImportMsg] = useState(null) // { ok, text, errors }

  const plan = useMemo(
    () => buildPlan(forecasts[queue.id], ahts[queue.id], queue, shrinkage, agents),
    [forecasts, ahts, queue, shrinkage, agents]
  )
  const sum = useMemo(() => summarisePlan(plan), [plan])
  const insight = useMemo(() => scheduleInsight(agents, plan, sum), [agents, plan, sum])

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { agents: imported, errors } = await parseScheduleFile(file)
      if (!imported.length) {
        setImportMsg({ ok: false, text: `No valid rows found in ${file.name}.`, errors })
      } else {
        setAgents(imported)
        setImportMsg({ ok: true, text: `Imported ${imported.length} agents from ${file.name}.`, errors })
      }
    } catch (err) {
      setImportMsg({ ok: false, text: `Could not read ${file.name}: ${err.message}`, errors: [] })
    }
    e.target.value = ''
  }

  function resetRoster() {
    setAgents(makeAgents())
    setImportMsg({ ok: true, text: 'Roster reset to the default generated schedule.', errors: [] })
  }

  const marker = (shift, idx) => {
    const [sh, sm] = shift.split('–')[0].split(':').map(Number)
    const start = sh * 60 + sm
    const [h, m] = INTERVALS[idx].label.split(':').map(Number)
    const mins = h * 60 + m
    if (mins === start + 240) return 'lunch'
    if (mins === start + 120) return 'break'
    return null
  }

  return (
    <>
      <TopBar title="Schedules — Roster" />
      <div className="content">
        <div className="grid cols-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>Bulk schedule import (Excel)</h3>
              <button className="btn" onClick={() => downloadTemplate(agents)}>⭳ Download template</button>
            </div>
            <div className="sub">Upload an <b>.xlsx</b> with columns <code>Name, Skills, Shift Start, Shift End, Team, TL</code>. Skills use sales / support / billing. The roster, coverage and plan update instantly.</div>
            <div
              className={`dropzone ${importMsg?.ok ? 'ok' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) onFile({ target: { files: e.dataTransfer.files, value: '' } }) }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
              <div style={{ fontSize: 22, marginBottom: 4 }}>⭱</div>
              <div>Drop an Excel file here or <span className="linklike">browse</span></div>
            </div>
            {importMsg && (
              <div style={{ marginTop: 10 }}>
                <span className={`pill ${importMsg.ok ? 'good' : 'bad'}`}>{importMsg.ok ? '✓' : '✕'} {importMsg.text}</span>
                {importMsg.errors?.length > 0 && (
                  <ul className="ai-bullets" style={{ marginTop: 8 }}>
                    {importMsg.errors.slice(0, 5).map((er, i) => <li key={i} style={{ color: 'var(--warn)' }}>{er}</li>)}
                  </ul>
                )}
                <button className="btn" style={{ marginTop: 10 }} onClick={resetRoster}>↺ Reset to default roster</button>
              </div>
            )}
          </div>
          <AISummary insight={insight} title="AI Scheduling Summary" />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="auxleg">
            <span><i style={{ background: queue.color }} /> on queue (skilled for {queue.name})</span>
            <span><i style={{ background: '#39456a' }} /> on shift, other skill</span>
            <span><i style={{ background: 'var(--warn)' }} /> lunch</span>
            <span><i style={{ background: 'var(--muted)' }} /> break</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Daily shift plan · {agents.length} agents</h3>
            <span className="pill neutral">07:00 – 19:00</span>
          </div>
          <div className="scroll">
            <table className="tbl" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0 }}>Agent</th>
                  <th>Team / TL</th>
                  <th>Shift</th>
                  {INTERVALS.map((iv, i) => (
                    <th key={i} style={{ padding: '6px 2px', fontSize: 9, minWidth: 26 }}>{i % 2 === 0 ? iv.label.slice(0, 5) : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const cov = coveredIdx(a.shift)
                  const skilled = a.skills.includes(queue.id)
                  return (
                    <tr key={a.id}>
                      <td style={{ textAlign: 'left', fontWeight: 600 }}>{a.name}<div className="muted" style={{ fontSize: 11 }}>{a.skills.join(', ')}</div></td>
                      <td style={{ textAlign: 'left' }}>{a.team}<div className="muted" style={{ fontSize: 11 }}>{a.tl}</div></td>
                      <td className="tabnum">{a.shift}</td>
                      {INTERVALS.map((_, i) => {
                        let bg = 'transparent'
                        if (cov[i]) {
                          const mk = marker(a.shift, i)
                          if (mk === 'lunch') bg = 'var(--warn)'
                          else if (mk === 'break') bg = 'var(--muted)'
                          else bg = skilled ? queue.color : '#39456a'
                        }
                        return <td key={i} style={{ padding: 2 }}><div style={{ height: 16, borderRadius: 3, background: bg }} /></td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: 700 }}>Scheduled (skilled)</td>
                  <td></td><td></td>
                  {plan.map((p, i) => <td key={i} className="tabnum" style={{ fontWeight: 700 }}>{p.scheduled}</td>)}
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: 700 }}>Required (gross)</td>
                  <td></td><td></td>
                  {plan.map((p, i) => <td key={i} className="tabnum" style={{ color: p.variance < 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 700 }}>{p.requiredGross}</td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
