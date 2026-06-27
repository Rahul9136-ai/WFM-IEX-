import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', icon: '▦', label: 'Dashboard', end: true },
  { sec: 'Plan' },
  { to: '/forecast', icon: '📈', label: 'Forecast' },
  { to: '/staffing', icon: '🧮', label: 'Planning (Erlang C)' },
  { to: '/schedules', icon: '🗓', label: 'Schedules' },
  { sec: 'Manage' },
  { to: '/intraday', icon: '⏱', label: 'Intraday' },
  { to: '/adherence', icon: '🎯', label: 'Real-Time Monitor' },
  { to: '/reports', icon: '📊', label: 'Reports' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">FF</div>
        <div className="name">
          FlowForce
          <small>WORKFORCE MGMT</small>
        </div>
      </div>
      <nav className="nav">
        {links.map((l, i) =>
          l.sec ? (
            <div className="sec" key={i}>{l.sec}</div>
          ) : (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ic">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          )
        )}
      </nav>
      <div className="foot">
        FlowForce WFM · demo build<br />Erlang-C engine · 30-min intervals
      </div>
    </aside>
  )
}
