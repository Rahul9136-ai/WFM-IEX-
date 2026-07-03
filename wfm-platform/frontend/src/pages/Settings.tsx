import { ShieldCheck } from "lucide-react"

import { PermissionGate } from "@/components/permission-gate"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type AccessLevel, MODULES, ROLE_DESCRIPTIONS, ROLES } from "@/lib/domain/roles"
import { cn } from "@/lib/utils"
import { useWfm } from "@/store/wfm"

const USERS = [
  { name: "Avery Owens", email: "avery.owens@flowforce.io", role: "Super Admin", status: "Active" },
  { name: "Priya Nair", email: "priya.nair@flowforce.io", role: "Planner", status: "Active" },
  { name: "Marcus Webb", email: "marcus.webb@flowforce.io", role: "Team Leader", status: "Active" },
  { name: "Sam Okoye", email: "sam.okoye@flowforce.io", role: "RTA", status: "Active" },
  { name: "Elena Faro", email: "elena.faro@flowforce.io", role: "WFM Manager", status: "Active" },
  { name: "Dana Fields", email: "dana.fields@flowforce.io", role: "Read-Only Viewer", status: "Invited" },
]

const NEXT: Record<AccessLevel, AccessLevel> = { none: "view", view: "edit", edit: "none" }
const CELL_STYLE: Record<AccessLevel, string> = {
  none: "text-muted-foreground/30",
  view: "bg-primary/10 text-primary",
  edit: "bg-emerald-500/15 text-emerald-500",
}
const CELL_LABEL: Record<AccessLevel, string> = { none: "—", view: "View", edit: "Edit" }

export function Settings() {
  const { permissions, setPermission, can } = useWfm()
  const editable = can("settings", "edit")

  return (
    <>
      <PageHeader
        title="Settings & RBAC"
        subtitle="Users · designation-level access · organisation"
        actions={
          <PermissionGate module="settings">
            <Button><ShieldCheck className="h-4 w-4" /> Invite user</Button>
          </PermissionGate>
        }
      />

      <Tabs defaultValue="roles">
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
                    <TableHead>Designation</TableHead>
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
          <Card className="glass mb-4">
            <CardContent className="grid gap-x-6 gap-y-2 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((r) => (
                <div key={r} className="text-xs">
                  <span className="font-semibold text-foreground">{r}</span>
                  <span className="text-muted-foreground"> — {ROLE_DESCRIPTIONS[r]}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Permission matrix</CardTitle>
              {!editable && <Badge variant="secondary">read-only for your designation</Badge>}
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                {editable ? "Click a cell to cycle none → view → edit." : "Switch to a designation with Settings edit access to change this matrix."}
              </p>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-semibold uppercase">Designation</th>
                      {MODULES.map((m) => (
                        <th key={m.id} className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase">{m.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLES.map((role) => (
                      <tr key={role} className="border-b hover:bg-muted/30">
                        <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium">{role}</td>
                        {MODULES.map((m) => {
                          const level = permissions[role]?.[m.id] ?? "none"
                          return (
                            <td key={m.id} className="p-1 text-center">
                              <button
                                type="button"
                                disabled={!editable}
                                onClick={() => setPermission(role, m.id, NEXT[level])}
                                className={cn(
                                  "w-14 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors",
                                  CELL_STYLE[level],
                                  editable ? "hover:brightness-125" : "cursor-default",
                                )}
                              >
                                {CELL_LABEL[level]}
                              </button>
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
