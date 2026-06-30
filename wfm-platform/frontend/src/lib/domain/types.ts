// Shared domain types for the WFM engine (ported from the proven prototype).

export interface Queue {
  id: string
  name: string
  color: string
  slTarget: number
  targetTime: number
  aht: number
}

export interface Agent {
  id: string
  name: string
  skills: string[]
  shift: string
  team: string
  tl: string
}

export type AuxCategory = "productive" | "break" | "shrink" | "offline"

export interface AuxCode {
  code: string
  label: string
  color: string
  cat: AuxCategory
  deferrable?: boolean
}

export interface RtaEntry {
  id: string
  actual: string
  scheduled: string
  secs: number
  recalled?: boolean
}

export interface Interval {
  idx: number
  label: string
}

export interface PlanRow {
  idx: number
  label: string
  volume: number
  intensity: number
  requiredNet: number
  requiredGross: number
  scheduled: number
  variance: number
  targetSL: number
  projSL: number
  asa: number
  occupancy: number
}

export interface PlanSummary {
  totalVol: number
  wSL: number
  reqHours: number
  schedHours: number
  underIntervals: number
  avgOcc: number
  peakIdx: number
}

export type ForecastKind = "Statistical" | "ML"
export type ForecastFn = (
  days: number[][],
  dows: number[],
  targetDow: number,
  targetDayIdx: number,
  doys?: number[],
  targetDoy?: number,
) => number[]

export interface ForecastMethod {
  id: string
  name: string
  kind: ForecastKind
  fn: ForecastFn
}

export interface MethodResult {
  id: string
  name: string
  kind: ForecastKind
  mape: number
  pred: number[]
}

export interface BucketRow {
  label: string
  volume: number
  required: number
  scheduled: number
  variance: number
  projSL: number
}
