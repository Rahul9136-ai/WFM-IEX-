import { useMemo, useState } from "react"

import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, UserCheck, UserPlus, Users } from "lucide-react"
import { QUEUES } from "@/lib/domain/seed"
import { useWfm } from "@/store/wfm"

const email = (name: string) => `${name.toLowerCase().replace(/[^a-z ]/g, "").replace(/ /g, ".")}@flowforce.io`
const skillName = (id: string) => QUEUES.find((q) => q.id === id)?.name ?? id

export function Employees() {
  const { agents } = useWfm()
  const [q, setQ] = useState("")

  const rows = useMemo(() => agents.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.team.toLowerCase().includes(q.toLowerCase())), [agents, q])
  const teams = new Set(agents.map((a) => a.team)).size

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Roster directory · skills · teams"
        actions={<Button><UserPlus className="h-4 w-4" /> Add employee</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Headcount" value={agents.length} hint="active agents" icon={Users} />
        <KpiCard label="Teams" value={teams} hint="Alpha · Bravo · Charlie" icon={Building2} />
        <KpiCard label="Multi-skilled" value={agents.filter((a) => a.skills.length > 1).length} hint="2+ skills" tone="good" icon={UserCheck} />
        <KpiCard label="Avg skills" value={(agents.reduce((s, a) => s + a.skills.length, 0) / agents.length).toFixed(1)} hint="per agent" icon={UserCheck} />
      </div>

      <Card className="glass">
        <CardContent className="pt-5">
          <Input placeholder="Search by name or team…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-left">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{email(a.name)}</div>
                  </TableCell>
                  <TableCell>{a.team}</TableCell>
                  <TableCell>{a.tl}</TableCell>
                  <TableCell className="tabular-nums">{a.shift}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {a.skills.map((s) => (
                        <Badge key={s} variant="secondary">{skillName(s)}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
