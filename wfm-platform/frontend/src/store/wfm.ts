import { create } from "zustand"

import { AGENTS, forecastFor, makeRTA, QUEUES, SHRINKAGE } from "@/lib/domain/seed"
import type { Agent, Queue, RtaEntry } from "@/lib/domain/types"

interface WfmState {
  queues: Queue[]
  queueId: string
  setQueueId: (id: string) => void
  queue: () => Queue

  agents: Agent[]
  rta: RtaEntry[]
  recallAgent: (id: string) => void
  recallMany: (ids: string[]) => void

  shrinkage: number
  setShrinkage: (n: number) => void

  nowIdx: number
  setNowIdx: (n: number) => void

  forecasts: Record<string, number[]>
  forecastMethod: Record<string, string>
  applyForecast: (qid: string, arr: number[], methodId: string) => void
  setVolume: (qid: string, idx: number, v: number) => void
}

export const useWfm = create<WfmState>((set, get) => ({
  queues: QUEUES,
  queueId: QUEUES[0].id,
  setQueueId: (id) => set({ queueId: id }),
  queue: () => get().queues.find((q) => q.id === get().queueId)!,

  agents: AGENTS,
  rta: makeRTA(AGENTS),
  recallAgent: (id) =>
    set((s) => ({ rta: s.rta.map((r) => (r.id === id ? { ...r, actual: "AVAIL", secs: 0, recalled: true } : r)) })),
  recallMany: (ids) =>
    set((s) => {
      const set2 = new Set(ids)
      return { rta: s.rta.map((r) => (set2.has(r.id) ? { ...r, actual: "AVAIL", secs: 0, recalled: true } : r)) }
    }),

  shrinkage: SHRINKAGE,
  setShrinkage: (n) => set({ shrinkage: n }),

  nowIdx: 13,
  setNowIdx: (n) => set({ nowIdx: n }),

  forecasts: Object.fromEntries(QUEUES.map((q) => [q.id, forecastFor(q.id)])),
  forecastMethod: Object.fromEntries(QUEUES.map((q) => [q.id, "baseline"])),
  applyForecast: (qid, arr, methodId) =>
    set((s) => ({
      forecasts: { ...s.forecasts, [qid]: arr.slice() },
      forecastMethod: { ...s.forecastMethod, [qid]: methodId },
    })),
  setVolume: (qid, idx, v) =>
    set((s) => {
      const next = { ...s.forecasts, [qid]: [...s.forecasts[qid]] }
      next[qid][idx] = Math.max(0, Math.round(v) || 0)
      return { forecasts: next, forecastMethod: { ...s.forecastMethod, [qid]: "manual" } }
    }),
}))
