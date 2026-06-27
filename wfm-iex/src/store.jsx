import { createContext, useContext, useMemo, useState } from 'react'
import { QUEUES, forecastFor, SHRINKAGE, makeAgents, makeRTA } from './data/seed.js'

const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

export function StoreProvider({ children }) {
  const [queueId, setQueueId] = useState(QUEUES[0].id)

  // Editable forecast: one volume array per queue.
  const [forecasts, setForecasts] = useState(() =>
    Object.fromEntries(QUEUES.map((q) => [q.id, forecastFor(q.id)]))
  )
  // Which forecasting method produced each queue's applied forecast.
  const [forecastMethod, setForecastMethod] = useState(() =>
    Object.fromEntries(QUEUES.map((q) => [q.id, 'baseline']))
  )

  const [ahts, setAhts] = useState(() =>
    Object.fromEntries(QUEUES.map((q) => [q.id, q.aht]))
  )
  const [shrinkage, setShrinkage] = useState(SHRINKAGE)
  const [nowIdx, setNowIdx] = useState(13)

  // Roster — replaceable via Excel import. RTA snapshot regenerates with it.
  const [agents, setAgentsState] = useState(() => makeAgents())
  const [rta, setRta] = useState(() => makeRTA(makeAgents()))

  const queue = useMemo(() => QUEUES.find((q) => q.id === queueId), [queueId])

  function setVolume(qid, idx, value) {
    setForecasts((prev) => {
      const next = { ...prev, [qid]: [...prev[qid]] }
      next[qid][idx] = Math.max(0, Math.round(value) || 0)
      return next
    })
    setForecastMethod((prev) => ({ ...prev, [qid]: 'manual' }))
  }
  function setAht(qid, value) {
    setAhts((prev) => ({ ...prev, [qid]: Math.max(30, Math.round(value) || 30) }))
  }
  function scaleForecast(qid, factor) {
    setForecasts((prev) => ({ ...prev, [qid]: prev[qid].map((v) => Math.max(0, Math.round(v * factor))) }))
    setForecastMethod((prev) => ({ ...prev, [qid]: 'manual' }))
  }
  // Apply a forecast produced by a statistical/ML method.
  function applyForecast(qid, arr, methodId) {
    setForecasts((prev) => ({ ...prev, [qid]: arr.slice() }))
    setForecastMethod((prev) => ({ ...prev, [qid]: methodId }))
  }

  // Replace the roster (e.g. from an Excel import) and refresh the live snapshot.
  function setAgents(next) {
    setAgentsState(next)
    setRta(makeRTA(next))
  }
  // Break recovery: pull an agent back to Available (cancel their break).
  function recallAgent(id) {
    setRta((prev) => prev.map((r) => (r.id === id ? { ...r, actual: 'AVAIL', secs: 0, recalled: true } : r)))
  }
  function recallMany(ids) {
    const set = new Set(ids)
    setRta((prev) => prev.map((r) => (set.has(r.id) ? { ...r, actual: 'AVAIL', secs: 0, recalled: true } : r)))
  }

  const value = {
    queues: QUEUES, queueId, setQueueId, queue,
    forecasts, setVolume, scaleForecast, applyForecast, forecastMethod,
    ahts, setAht,
    shrinkage, setShrinkage,
    nowIdx, setNowIdx,
    agents, setAgents,
    rta, recallAgent, recallMany,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
