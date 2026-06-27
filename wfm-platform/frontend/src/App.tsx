import { Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/app-shell"
import { Capacity } from "@/pages/Capacity"
import { Copilot } from "@/pages/Copilot"
import { Dashboard } from "@/pages/Dashboard"
import { Employees } from "@/pages/Employees"
import { Erlang } from "@/pages/Erlang"
import { Forecasting } from "@/pages/Forecasting"
import { Intraday } from "@/pages/Intraday"
import { Pto } from "@/pages/Pto"
import { Reports } from "@/pages/Reports"
import { Rta } from "@/pages/Rta"
import { Scheduling } from "@/pages/Scheduling"
import { Settings } from "@/pages/Settings"
import { Skills } from "@/pages/Skills"

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/forecasting" element={<Forecasting />} />
        <Route path="/capacity" element={<Capacity />} />
        <Route path="/erlang" element={<Erlang />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/intraday" element={<Intraday />} />
        <Route path="/rta" element={<Rta />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/pto" element={<Pto />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/copilot" element={<Copilot />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  )
}
