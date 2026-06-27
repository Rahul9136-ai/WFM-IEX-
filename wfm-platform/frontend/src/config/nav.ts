import {
  Activity,
  BarChart3,
  CalendarRange,
  Calculator,
  Clock,
  LayoutDashboard,
  type LucideIcon,
  PlaneTakeoff,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-react"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Plan",
    items: [
      { to: "/forecasting", label: "Forecasting", icon: TrendingUp },
      { to: "/capacity", label: "Capacity Planning", icon: BarChart3 },
      { to: "/erlang", label: "Erlang Calculator", icon: Calculator },
      { to: "/scheduling", label: "Scheduling", icon: CalendarRange },
    ],
  },
  {
    group: "Operate",
    items: [
      { to: "/intraday", label: "Intraday", icon: Clock },
      { to: "/rta", label: "Real-Time Monitor", icon: Activity },
    ],
  },
  {
    group: "Workforce",
    items: [
      { to: "/employees", label: "Employees", icon: UsersRound },
      { to: "/skills", label: "Skills", icon: Star },
      { to: "/pto", label: "PTO & Leave", icon: PlaneTakeoff },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/reports", label: "Reports & KPIs", icon: BarChart3 },
      { to: "/copilot", label: "AI Copilot", icon: Sparkles },
    ],
  },
  {
    group: "Admin",
    items: [{ to: "/settings", label: "Settings & RBAC", icon: Settings }],
  },
]
