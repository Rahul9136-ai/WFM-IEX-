import { useState } from "react"

import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarCheck, CalendarClock, CalendarX, PlaneTakeoff } from "lucide-react"
import { useWfm } from "@/store/wfm"

type Status = "Pending" | "Approved" | "Denied"
interface Leave {
  id: string
  agent: string
  type: string
  from: string
  to: string
  days: number
  status: Status
}

const TYPES = ["Annual Leave", "Sick", "Personal", "Unpaid", "Bereavement"]

export function Pto() {
  const { agents } = useWfm()
  const [rows, setRows] = useState<Leave[]>(() =>
    agents.slice(0, 9).map((a, i) => ({
      id: "lv" + i,
      agent: a.name,
      type: TYPES[i % TYPES.length],
      from: `2026-07-${String(((i * 3) % 27) + 1).padStart(2, "0")}`,
      to: `2026-07-${String(((i * 3) % 27) + 1 + (i % 4)).padStart(2, "0")}`,
      days: (i % 4) + 1,
      status: i % 3 === 0 ? "Pending" : i % 3 === 1 ? "Approved" : "Denied",
    })),
  )

  const setStatus = (id: string, status: Status) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))

  const pending = rows.filter((r) => r.status === "Pending").length
  const approved = rows.filter((r) => r.status === "Approved").length
  const variant: Record<Status, "warning" | "success" | "destructive"> = { Pending: "warning", Approved: "success", Denied: "destructive" }

  return (
    <>
      <PageHeader title="PTO & Leave Management" subtitle="Requests · balances · approvals" actions={<Button><PlaneTakeoff className="h-4 w-4" /> New request</Button>} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Pending" value={pending} hint="awaiting approval" tone="warn" icon={CalendarClock} />
        <KpiCard label="Approved" value={approved} hint="this month" tone="good" icon={CalendarCheck} />
        <KpiCard label="On leave today" value={2} hint="impacts coverage" icon={CalendarX} />
        <KpiCard label="Avg balance" value="14.5d" hint="annual entitlement" icon={PlaneTakeoff} />
      </div>

      <Card className="glass">
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-left font-medium">{r.agent}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell className="tabular-nums">{r.from}</TableCell>
                  <TableCell className="tabular-nums">{r.to}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell>
                    <Badge variant={variant[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "Pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "Approved")}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "Denied")}>Deny</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
