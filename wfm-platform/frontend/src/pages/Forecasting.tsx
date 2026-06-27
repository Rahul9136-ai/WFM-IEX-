import { useEffect, useMemo, useState } from "react"

import { AiSummary } from "@/components/ai-summary"
import { SeriesChart } from "@/components/charts/series-chart"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addDays, fmtDay, parseYMD, PRESETS, TODAY, ymd } from "@/lib/domain/dates"
import { generate } from "@/lib/domain/forecast"
import { backtestG, type GranId, GRANULARITIES, rangePlan, summariseBuckets } from "@/lib/domain/granularity"
import { fmtPct } from "@/lib/domain/planning"
import { QUEUES } from "@/lib/domain/seed"
import { cn } from "@/lib/utils"
import { useWfm } from "@/store/wfm"

export function Forecasting() {
  const { queueId, applyForecast, shrinkage, agents } = useWfm()
  const queue = QUEUES.find((q) => q.id === queueId)!

  const [gran, setGran] = useState<GranId>("weekly")
  const [start, setStart] = useState(ymd(TODAY))
  const [end, setEnd] = useState(ymd(addDays(TODAY, 6)))

  const bt = useMemo(() => backtestG(queue.id, gran), [queue.id, gran])
  const [method, setMethod] = useState(bt.best.id)
  useEffect(() => setMethod(bt.best.id), [bt.best.id])
  const previewMethod = bt.perMethod.find((m) => m.id === method) ?? bt.best

  const rp = useMemo(
    () => rangePlan(queue.id, parseYMD(start), parseYMD(end), gran, method, queue.aht, queue, shrinkage, agents),
    [queue.id, start, end, gran, method, queue, shrinkage, agents],
  )
  const bsum = useMemo(() => summariseBuckets(rp.rows), [rp])

  function apply(id: string) {
    setMethod(id)
    applyForecast(queue.id, generate(queue.id, id), id)
  }

  const btData = bt.labels.map((l, i) => ({ label: l, Actual: bt.actual[i], Forecast: previewMethod.pred[i] }))
  const fwdData = rp.rows.map((r) => ({ label: r.label, Volume: r.volume }))

  const insight = {
    headline: `${bt.best.name} is the most accurate model for ${queue.name} (${fmtPct(bt.best.mape)} MAPE, ${gran}).`,
    bullets: [
      `Best ML model ${bt.perMethod.filter((m) => m.kind === "ML").sort((a, b) => a.mape - b.mape)[0]?.name} vs best statistical ${bt.perMethod.filter((m) => m.kind === "Statistical").sort((a, b) => a.mape - b.mape)[0]?.name}.`,
      `Applied (${previewMethod.name}) projects ${bsum.totalVol.toLocaleString()} contacts over ${rp.nDays} days, peaking ${bsum.peakLabel}.`,
      method === bt.best.id ? "You're on the most accurate model — good basis for staffing." : `Switch to ${bt.best.name} for ${fmtPct(previewMethod.mape - bt.best.mape)} lower error.`,
    ],
    tone: method === bt.best.id ? ("good" as const) : ("warn" as const),
  }

  return (
    <>
      <PageHeader
        title="Forecasting"
        subtitle={`${queue.name} · statistical + ML models · back-tested MAPE`}
        actions={
          <div className="inline-flex rounded-lg bg-muted p-1">
            {GRANULARITIES.map((g) => (
              <button
                key={g.id}
                onClick={() => setGran(g.id)}
                className={cn("rounded-md px-3 py-1 text-sm font-medium", gran === g.id ? "bg-background shadow-sm" : "text-muted-foreground")}
              >
                {g.name}
              </button>
            ))}
          </div>
        }
      />

      <Card className="glass mb-4">
        <CardHeader>
          <CardTitle>Model selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {bt.perMethod.map((m) => (
              <button
                key={m.id}
                onClick={() => apply(m.id)}
                className={cn(
                  "flex flex-col items-start rounded-lg border px-4 py-2 text-left transition-colors",
                  m.id === method ? "border-primary bg-primary/10" : "hover:bg-accent",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.kind}</span>
                <span className="text-sm font-semibold">{m.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums">
                  {fmtPct(m.mape)}
                  {m.id === bt.best.id && <Badge variant="success">best</Badge>}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Back-test — {previewMethod.name}</CardTitle>
            <Badge variant={previewMethod.id === bt.best.id ? "success" : "warning"}>MAPE {fmtPct(previewMethod.mape)}</Badge>
          </CardHeader>
          <CardContent>
            <SeriesChart
              data={btData}
              xKey="label"
              yLabel={bt.unit}
              series={[
                { key: "Actual", name: "Actual (held-out)", color: "#22c55e" },
                { key: "Forecast", name: previewMethod.name, color: queue.color, dashed: true },
              ]}
            />
          </CardContent>
        </Card>
        <AiSummary insight={insight} title="AI Forecast Summary" />
      </div>

      <Card className="glass mt-4">
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Forecast by {rp.bucket}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {fmtDay(parseYMD(start))} → {fmtDay(parseYMD(end))} · {rp.nDays} days → {rp.rows.length} {rp.bucket}
              {rp.rows.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setStart(ymd(TODAY))
                  setEnd(ymd(addDays(TODAY, p.days)))
                }}
                className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
              >
                {p.label}
              </button>
            ))}
            <Input type="date" value={start} min={ymd(TODAY)} onChange={(e) => setStart(e.target.value)} className="w-auto" />
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          <SeriesChart data={fwdData} xKey="label" series={[{ key: "Volume", name: "Forecast volume", color: queue.color, type: "bar" }]} />
          <div className="mt-4 max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{rp.bucket}</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Req. (hrs)</TableHead>
                  <TableHead>Scheduled (hrs)</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Proj. SL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rp.rows.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell>{r.volume.toLocaleString()}</TableCell>
                    <TableCell>{r.required.toLocaleString()}</TableCell>
                    <TableCell>{r.scheduled.toLocaleString()}</TableCell>
                    <TableCell className={r.variance < 0 ? "font-semibold text-destructive" : "font-semibold text-emerald-500"}>
                      {r.variance > 0 ? "+" : ""}
                      {r.variance.toLocaleString()}
                    </TableCell>
                    <TableCell>{fmtPct(r.projSL)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
