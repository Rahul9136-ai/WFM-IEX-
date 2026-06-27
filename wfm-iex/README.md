# FlowForce WFM

A NICE **IEX-style Workforce Management** tool for contact centres — a clickable React/Vite prototype with a real **Erlang C** staffing engine (no faked staffing numbers).

## What it does

| Module | What it covers |
| --- | --- |
| **Dashboard** | Live KPIs — projected service level, ASA, occupancy, adherence; intraday forecast-vs-actual and required-vs-scheduled charts. |
| **Forecast** | **Statistical + ML forecasting** at **Daily / Weekly / Monthly** granularity, per-method **MAPE** back-test, one-click apply, editable interval detail, and an **AI forecast summary**. |
| **Planning (Erlang C)** | **Daily / Weekly / Monthly** capacity plan (agents → agent-hours), single-interval staffing calculator + sensitivity table, and an **AI planning summary**. |
| **Schedules** | Gantt-style roster grid + **bulk Excel (.xlsx) import / template export** and an **AI scheduling summary**. |
| **Intraday** | Advance the day clock, watch actuals drift from forecast, auto **reforecast** the remaining day from pacing. |
| **Real-Time Monitor** | **Verint-style AUX wallboard** — every agent's reason code, live time-in-state, off-plan flags + **AI break-recovery** that names agents to recall and flags them to TLs. |
| **Reports** | Centre roll-up: service level by queue, shrinkage composition, coverage curve, queue summary. |

## Forecasting (`src/lib/forecast.js`)

Five real methods, each producing a 24-interval day forecast, back-tested by holding out the most recent day and scoring **MAPE**:

- **Statistical** — Seasonal Naïve, Moving Average, Holt-Winters (additive triple exponential smoothing)
- **ML** — Linear Regression (OLS on engineered seasonal/trend features) and k-Nearest-Neighbours regression

The best (lowest-MAPE) method is badged automatically; pick any to drive the staffing plan. History is synthesised in `src/data/history.js` (35 days, trend + weekday seasonality + noise).

**Date range + granularity** (`src/lib/dates.js`, `src/lib/granularity.js`) — both the Forecast and Planning tabs take a **From / To date range** (with Today / 7-day / 14-day / 30-day presets) plus a **Daily / Weekly / Monthly** bucket size:
- A **single day** at Daily granularity shows the 30-min interval view — editable when it's *today* (drives the live plan), read-only model profile for any other date.
- A **multi-day range** buckets by **day**, **calendar week**, or **calendar month**, with requirement in **agent-hours** and real date labels (e.g. `Fri 26 Jun`, `wk 22 Jun`, `Jul 2026`).

Dates are anchored to an app "today" (`TODAY`); the synthetic history ends the day before, and its weekdays are aligned to the real calendar so trend-aware models (Linear Regression) extrapolate genuine month-over-month growth. MAPE is re-back-tested at each granularity (daily = held-out day's intervals; weekly = 7 day-totals; monthly = 14 day-totals), so the "best" model can differ by horizon.

## The staffing math (`src/lib/erlang.js`)

- **Offered load** (Erlangs) = `volume × AHT ÷ interval`
- **Erlang C** probability-of-wait via the numerically-stable Erlang B recursion
- **Service level** = `1 − C·e^(−(N−A)·t/AHT)`, plus **ASA** and **occupancy**
- **Required agents** = smallest N meeting the SL target under an occupancy cap
- **Shrinkage** grosses productive staff up to a rostered requirement

## AI summaries (`src/lib/insights.js`)

Each planning tab carries a generated summary — rule-based analysis of the real computed numbers (best/worst forecast model, under-staffed intervals, coverage surplus/deficit, break-recovery advice). Deterministic and offline; no LLM key required.

## Excel import (`src/lib/schedule.js`)

Download a pre-filled template, edit in Excel, drop the `.xlsx` back in. Columns: `Name, Skills, Shift Start, Shift End, Team, TL` (skills accept sales/support/billing by id or name). Uses SheetJS; the roster, coverage and plan update instantly.

## Run

```bash
npm install
npm run dev      # http://localhost:5175
```

Stack: React 18 + Vite 5 + React Router 6 + SheetJS (xlsx). No backend — data is mocked in `src/data/seed.js` and `src/data/history.js`.
