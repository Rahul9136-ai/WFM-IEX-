import { Check, ShieldCheck } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const USERS = [
  { name: "Avery Owens", email: "avery.owens@flowforce.io", role: "Administrator", status: "Active" },
  { name: "Priya Nair", email: "priya.nair@flowforce.io", role: "Planner", status: "Active" },
  { name: "Marcus Webb", email: "marcus.webb@flowforce.io", role: "Team Lead", status: "Active" },
  { name: "Sam Okoye", email: "sam.okoye@flowforce.io", role: "Team Lead", status: "Active" },
  { name: "Dana Fields", email: "dana.fields@flowforce.io", role: "Viewer", status: "Invited" },
]

const ROLES = ["Administrator", "Planner", "Team Lead", "Viewer"]
const PERMS = ["Forecasts", "Schedules", "Real-Time", "Employees", "Reports", "Settings"]
const MATRIX: Record<string, boolean[]> = {
  Administrator: [true, true, true, true, true, true],
  Planner: [true, true, true, false, true, false],
  "Team Lead": [false, true, true, true, true, false],
  Viewer: [false, false, true, false, true, false],
}

export function Settings() {
  return (
    <>
      <PageHeader title="Settings & RBAC" subtitle="Users · roles · permissions · organisation" actions={<Button><ShieldCheck className="h-4 w-4" /> Invite user</Button>} />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="org">Organisation</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass">
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {USERS.map((u) => (
                    <TableRow key={u.email}>
                      <TableCell className="text-left">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell>
                        <Badge variant={u.status === "Active" ? "success" : "warning"}>{u.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Permission matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Role</th>
                    {PERMS.map((p) => (
                      <th key={p} className="px-3 py-2 text-center text-xs font-semibold uppercase">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{role}</td>
                      {MATRIX[role].map((allowed, i) => (
                        <td key={i} className="px-3 py-2 text-center">
                          {allowed ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground/30">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org">
          <Card className="glass max-w-xl">
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Organisation" value="FlowForce Contact Centre" />
              <Row label="Plan" value="Enterprise" />
              <Row label="Timezone" value="UTC" />
              <Row label="Service window" value="07:00 – 19:00" />
              <Row label="Interval length" value="30 minutes" />
              <Row label="Default shrinkage" value="25%" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
