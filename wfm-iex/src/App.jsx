import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Forecast from './pages/Forecast.jsx'
import Staffing from './pages/Staffing.jsx'
import Schedules from './pages/Schedules.jsx'
import Intraday from './pages/Intraday.jsx'
import Adherence from './pages/Adherence.jsx'
import Reports from './pages/Reports.jsx'

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/staffing" element={<Staffing />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/intraday" element={<Intraday />} />
          <Route path="/adherence" element={<Adherence />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </div>
  )
}
