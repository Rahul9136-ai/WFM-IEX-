import { useStore } from '../store.jsx'
import { INTERVALS } from '../data/seed.js'

export default function TopBar({ title }) {
  const { queues, queueId, setQueueId, nowIdx } = useStore()
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="spacer" />
      <div className="qpick">
        {queues.map((q) => (
          <button
            key={q.id}
            className={q.id === queueId ? 'on' : ''}
            style={q.id === queueId ? { background: q.color } : {}}
            onClick={() => setQueueId(q.id)}
          >
            {q.name}
          </button>
        ))}
      </div>
      <div className="clock">
        <span className="dot-live" />
        Live · {INTERVALS[nowIdx]?.label}
      </div>
    </header>
  )
}
