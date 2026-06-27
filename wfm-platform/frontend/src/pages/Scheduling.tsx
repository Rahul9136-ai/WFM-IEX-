import { useMemo } from "react"

import { AiSummary } from "@/components/ai-summary"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildPlan, fmtPct, summarisePlan } from "@/lib/domain/planning"
import { INTERVALS, QUEUES } from "@/lib/domain/seed"
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

function marker(shift: string, idx: number): "lunch" | "break" | null {
  const [sh, sm] = shift.split("–")[0].split(":").map(Number)
  const startM = sh * 60 + sm
  const [h, m] = INTERVALS[idx].label.split(":").map(Number)
  const mins = h * 60 + m
  if (mins === startM + 240) return "lunch"
  if (mins === startM + 120) return "break"
  return null
}

export function Scheduling() {
  const { queueId, forecasts, shrinkage, agents } = useWfm()
  const queue = QUEUES.find((q) => q.id === queueId)!
  const plan = useMemo(() => buildPlan(forecasts[queue.id], queue.aht, queue, shrinkage, agents), [forecasts, queue, shrinkage, agents])
  const sum = useMemo(() => summarisePlan(plan), [plan])

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
      <PageHeader title="Scheduling" subtitle={`Daily roster · ${agents.length} agents · 07:00–19:00`} actions={<Badge variant="secondary">skilled for {queue.name}</Badge>} />

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
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="sticky left-0 bg-card px-2 py-1 font-medium">{a.name}</td>
                      <td className="px-2 py-1 tabular-nums text-muted-foreground">{a.shift}</td>
                      {INTERVALS.map((_, i) => {
                        let bg = "transparent"
                        if (cov[i]) {
                          const mk = marker(a.shift, i)
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
