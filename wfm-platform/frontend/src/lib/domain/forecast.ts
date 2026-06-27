// Forecasting engine — statistical + ML methods, back-tested with MAPE.
import { HISTORY_DAYS, historyFor } from "./history"
import type { ForecastMethod, MethodResult } from "./types"

const M = 24
const TWO_PI = Math.PI * 2

function intervalFeatures(i: number): number[] {
  return [
    Math.sin((TWO_PI * i) / M), Math.cos((TWO_PI * i) / M),
    Math.sin((2 * TWO_PI * i) / M), Math.cos((2 * TWO_PI * i) / M),
  ]
}
function dowFeatures(dow: number): number[] {
  return [Math.sin((TWO_PI * dow) / 7), Math.cos((TWO_PI * dow) / 7)]
}

// ---- statistical ----
function seasonalNaive(days: number[][], dows: number[], targetDow: number): number[] {
  for (let d = days.length - 1; d >= 0; d--) if (dows[d] === targetDow) return days[d].slice()
  return days[days.length - 1].slice()
}

function movingAverage(days: number[][], dows: number[], targetDow: number, _t: number, K = 4): number[] {
  const sameDow = days.filter((_, d) => dows[d] === targetDow)
  const pool = (sameDow.length >= 2 ? sameDow : days).slice(-K)
  return Array.from({ length: M }, (_, i) =>
    Math.round(pool.reduce((a, day) => a + day[i], 0) / pool.length),
  )
}

function holtWinters(days: number[][], dows: number[], targetDow: number, _t: number): number[] {
  const alpha = 0.4, beta = 0.04, gamma = 0.3
  const Y = days.flat()
  const n = Y.length
  if (n < 2 * M) return movingAverage(days, dows, targetDow, _t)
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  let level = mean(Y.slice(0, M))
  let trend = (mean(Y.slice(M, 2 * M)) - mean(Y.slice(0, M))) / M
  const seasonal = Y.slice(0, M).map((y) => y - level)
  for (let t = M; t < n; t++) {
    const s = seasonal[t % M]
    const newLevel = alpha * (Y[t] - s) + (1 - alpha) * (level + trend)
    trend = beta * (newLevel - level) + (1 - beta) * trend
    seasonal[t % M] = gamma * (Y[t] - newLevel) + (1 - gamma) * s
    level = newLevel
  }
  return Array.from({ length: M }, (_, h) => Math.max(0, Math.round(level + (h + 1) * trend + seasonal[h % M])))
}

// ---- ML ----
function gaussianSolve(A: number[][], b: number[]): number[] {
  const n = b.length
  const m = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r
    ;[m[col], m[piv]] = [m[piv], m[col]]
    const d = m[col][col] || 1e-9
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r][col] / d
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c]
    }
  }
  return m.map((row, i) => row[n] / (m[i][i] || 1e-9))
}

function lrRow(i: number, dow: number, dayNorm: number): number[] {
  return [1, ...intervalFeatures(i), ...dowFeatures(dow), dayNorm]
}

function linearRegression(days: number[][], dows: number[], targetDow: number, targetDayIdx: number): number[] {
  const X: number[][] = []
  const y: number[] = []
  days.forEach((day, d) => {
    day.forEach((v, i) => {
      X.push(lrRow(i, dows[d], d / HISTORY_DAYS))
      y.push(v)
    })
  })
  const p = X[0].length
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0))
  const Xty = new Array(p).fill(0)
  for (let r = 0; r < X.length; r++) {
    for (let a = 0; a < p; a++) {
      Xty[a] += X[r][a] * y[r]
      for (let b = a; b < p; b++) XtX[a][b] += X[r][a] * X[r][b]
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a]
    XtX[a][a] += 1e-4
  }
  const w = gaussianSolve(XtX, Xty)
  const dn = (targetDayIdx ?? HISTORY_DAYS) / HISTORY_DAYS
  return Array.from({ length: M }, (_, i) => {
    const row = lrRow(i, targetDow, dn)
    return Math.max(0, Math.round(row.reduce((s, x, k) => s + x * w[k], 0)))
  })
}

const dist2 = (a: number[], b: number[]) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0)

function knn(days: number[][], dows: number[], targetDow: number, targetDayIdx: number, k = 8): number[] {
  const samples: { f: number[]; v: number }[] = []
  days.forEach((day, d) => {
    day.forEach((v, i) => {
      samples.push({ f: [...intervalFeatures(i), ...dowFeatures(dows[d]), (d / HISTORY_DAYS) * 0.6], v })
    })
  })
  const dn = ((targetDayIdx ?? HISTORY_DAYS) / HISTORY_DAYS) * 0.6
  return Array.from({ length: M }, (_, i) => {
    const q = [...intervalFeatures(i), ...dowFeatures(targetDow), dn]
    const scored = samples.map((s) => ({ v: s.v, dist: dist2(s.f, q) })).sort((a, b) => a.dist - b.dist).slice(0, k)
    return Math.round(scored.reduce((a, s) => a + s.v, 0) / scored.length)
  })
}

export const METHODS: ForecastMethod[] = [
  { id: "snaive", name: "Seasonal Naïve", kind: "Statistical", fn: seasonalNaive },
  { id: "movavg", name: "Moving Average", kind: "Statistical", fn: movingAverage },
  { id: "holt", name: "Holt-Winters", kind: "Statistical", fn: holtWinters },
  { id: "linreg", name: "Linear Regression", kind: "ML", fn: linearRegression },
  { id: "knn", name: "k-NN Regression", kind: "ML", fn: knn },
]
export const methodById: Record<string, ForecastMethod> = Object.fromEntries(METHODS.map((m) => [m.id, m]))

export function mape(pred: number[], actual: number[]): number {
  let s = 0, c = 0
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] > 0) {
      s += Math.abs(pred[i] - actual[i]) / actual[i]
      c++
    }
  }
  return c ? s / c : 0
}

export interface Backtest {
  perMethod: MethodResult[]
  best: MethodResult
  holdout: number[]
  holdoutDow: number
}

export function backtest(queueId: string): Backtest {
  const { days, dows } = historyFor(queueId)
  const L = days.length - 1
  const train = days.slice(0, L)
  const trainDows = dows.slice(0, L)
  const holdout = days[L]
  const perMethod: MethodResult[] = METHODS.map((m) => {
    const forecast = m.fn(train, trainDows, dows[L], L)
    return { id: m.id, name: m.name, kind: m.kind, mape: mape(forecast, holdout), pred: forecast }
  })
  const best = perMethod.reduce((a, b) => (b.mape < a.mape ? b : a))
  return { perMethod, best, holdout, holdoutDow: dows[L] }
}

export function generate(queueId: string, methodId: string): number[] {
  const { days, dows } = historyFor(queueId)
  const m = methodById[methodId] ?? METHODS[0]
  const targetDow = (dows[dows.length - 1] + 1) % 7
  return m.fn(days, dows, targetDow, HISTORY_DAYS)
}
