import { useMemo } from "react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { QUEUES } from "@/lib/domain/seed"
import { useWfm } from "@/store/wfm"
import { cn } from "@/lib/utils"

export function Skills() {
  const { agents } = useWfm()

  const coverage = useMemo(
    () =>
      QUEUES.map((q) => {
        const skilled = agents.filter((a) => a.skills.includes(q.id))
        return { q, count: skilled.length, pct: skilled.length / agents.length }
      }),
    [agents],
  )

  return (
    <>
      <PageHeader title="Skills Management" subtitle="Skill coverage & competency matrix" />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {coverage.map(({ q, count, pct }) => (
          <Card key={q.id} className="glass">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ background: q.color }} /> {q.name}
              </CardTitle>
              <span className="text-2xl font-bold tabular-nums">{count}</span>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: q.color }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{Math.round(pct * 100)}% of workforce skilled · AHT {q.aht}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Competency matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Agent</th>
                  {QUEUES.map((q) => (
                    <th key={q.id} className="px-3 py-2 text-xs font-semibold uppercase">{q.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    {QUEUES.map((q) => {
                      const has = a.skills.includes(q.id)
                      const primary = a.skills[0] === q.id
                      return (
                        <td key={q.id} className="px-3 py-2 text-center">
                          {has ? (
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", primary ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                              <Check className="h-3 w-3" /> {primary ? "Primary" : "Secondary"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
