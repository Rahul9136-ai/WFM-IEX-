import { useMemo, useRef, useState } from "react"
import { CalendarClock, FileDown, Upload } from "lucide-react"
import { Link } from "react-router-dom"

import { AiSummary } from "@/components/ai-summary"
import { ExportButton } from "@/components/export-button"
import { PageHeader } from "@/components/page-header"
import { PermissionGate } from "@/components/permission-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildPlan, fmtPct, summarisePlan } from "@/lib/domain/planning"
import { INTERVALS } from "@/lib/domain/seed"
import { patternMarkers, resolvePatternForAgent } from "@/lib/domain/shiftPatterns"
import { downloadTemplate, parseScheduleFile } from "@/lib/schedule"
import { useWfm } from "@/store/wfm"

function coveredIdx(shift: string): boolean[] {
  const [s, e] = shift.split("–").map((t) => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  })
  return INTERVALS.map(({ label }) => {
    const [h, m] = label.split(":").map(Number)
    const mins = h * 60 + m
    return mins >= s && mins < e
  })
}

export function Scheduling() {
  const { queueId, forecasts, shrinkage, agents, setAgents, shiftPatterns, queues } = useWfm()
  const queue = queues.find((q) => q.id === queueId)!
  const plan = useMemo(() => buildPlan(forecasts[queue.id], queue.aht, queue, shrinkage, agents), [forecasts, queue, shrinkage, agents])
  const sum = useMemo(() => summarisePlan(plan), [plan])

  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { agents: imported, errors } = await parseScheduleFile(file, queues)
      if (!imported.length) {
        setImportMsg({ ok: false, text: `No valid rows in ${file.name}. ${errors.slice(0, 2).join("; ")}` })
      } else {
        setAgents(imported, `${imported.length} agents from ${file.name}`)
        setImportMsg({ ok: true, text: `Imported ${imported.length} agents from ${file.name}${errors.length ? ` (${errors.length} rows skipped)` : ""}.` })
      }
    } catch (err) {
      setImportMsg({ ok: false, text: `Could not read ${file.name}: ${(err as Error).message}` })
    }
    e.target.value = ""
  }

  const under = plan.filter((p) => p.variance < 0)
  const insight = {
    headline: under.length ? `Roster covers ${fmtPct(1 - under.length / plan.length)} of intervals; ${under.length} need a tweak.` : "Roster fully covers the forecast — well-shaped shift plan.",
    bullets: [
      `${agents.length} agents · ${sum.schedHours.toFixed(0)} scheduled hrs vs ${sum.reqHours.toFixed(0)} required.`,
      "Break & lunch optimisation places relief ~2h and ~4h into each shift.",
      "Skill-based routing: dual-skilled agents cover overlapping queues at peak.",
    ],
    tone: under.length > 6 ? ("warn" as const) : ("good" as const),
  }

  return (
    <>
      <PageHeader
        title="Scheduling"
        subtitle={`Daily roster · ${agents.length} agents · 07:00–19:00`}
        actions={
          <>
            <Badge variant="secondary" className="hidden lg:inline-flex">skilled for {queue.name}</Badge>
            <PermissionGate module="scheduling">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
              <Button variant="outline" onClick={() => downloadTemplate(agents)}>
                <FileDown className="h-4 w-4" /> Template
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Import schedule
              </Button>
            </PermissionGate>
            <Button variant="outline" asChild>
              <Link to="/shift-patterns"><CalendarClock className="h-4 w-4" /> Shift patterns</Link>
            </Button>
            <ExportButton
              filename={`schedule-${queue.id}`}
              sheets={() => [
                { name: "Roster", rows: agents.map((a) => ({ Name: a.name, Team: a.team, "Team Lead": a.tl, Shift: a.shift, Skills: a.skills.map((s) => queues.find((q) => q.id === s)?.name ?? s).join(", ") })) },
                { name: "Coverage", rows: plan.map((p) => ({ Interval: p.label, Scheduled: p.scheduled, Required: p.requiredGross, Variance: p.variance })) },
              ]}
            />
          </>
        }
      />

      {importMsg && (
        <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${importMsg.ok ? "border-emerald-500/40 text-emerald-500" : "border-destructive/40 text-destructive"}`}>
          {importMsg.ok ? "✓ " : "✕ "}
          {importMsg.text}
          {importMsg.ok && <span className="text-muted-foreground"> Coverage & plans updated across the app.</span>}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <AiSummary insight={insight} title="AI Scheduling Summary" />
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><i className="h-3 w-4 rounded" style={{ background: queue.color }} /> on queue ({queue.name})</span>
            <span className="flex items-center gap-2"><i className="h-3 w-4 rounded bg-slate-500" /> on shift, other skill</span>
            <span className="flex items-center gap-2"><i className="h-3 w-4 rounded bg-amber-500" /> lunch</span>
            <span className="flex items-center gap-2"><i className="h-3 w-4 rounded bg-muted-foreground" /> break</span>
            <span className="ml-auto text-xs">Break/lunch layout comes from each agent's <Link to="/shift-patterns" className="text-primary hover:underline">shift pattern</Link>.</span>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Daily shift plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="sticky left-0 bg-card px-2 py-1 text-left">Agent</th>
                  <th className="px-2 py-1 text-left">Shift</th>
                  {INTERVALS.map((iv, i) => (
                    <th key={i} className="px-0.5 py-1 text-[9px] font-normal">{i % 2 === 0 ? iv.label.slice(0, 5) : ""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const cov = coveredIdx(a.shift)
                  const skilled = a.skills.includes(queue.id)
                  const markers = patternMarkers(resolvePatternForAgent(a, shiftPatterns))
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="sticky left-0 bg-card px-2 py-1 font-medium">{a.name}</td>
                      <td className="px-2 py-1 tabular-nums text-muted-foreground">{a.shift}</td>
                      {INTERVALS.map((_, i) => {
                        let bg = "transparent"
                        if (cov[i]) {
                          const mk = markers.get(i)
                          if (mk === "lunch") bg = "#f59e0b"
                          else if (mk === "break") bg = "hsl(var(--muted-foreground))"
                          else bg = skilled ? queue.color : "#64748b"
                        }
                        return (
                          <td key={i} className="p-[1px]">
                            <div className="h-4 rounded-sm" style={{ background: bg }} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="sticky left-0 bg-card px-2 py-1">Scheduled</td>
                  <td />
                  {plan.map((p, i) => (
                    <td key={i} className="px-0.5 text-center tabular-nums">{p.scheduled}</td>
                  ))}
                </tr>
                <tr className="font-semibold">
                  <td className="sticky left-0 bg-card px-2 py-1">Required</td>
                  <td />
                  {plan.map((p, i) => (
                    <td key={i} className={`px-0.5 text-center tabular-nums ${p.variance < 0 ? "text-destructive" : "text-emerald-500"}`}>
                      {p.requiredGross}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
