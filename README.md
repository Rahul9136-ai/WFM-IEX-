# WFM — Workforce Management (IEX / Verint / NICE-style)

Two original, contact-centre **Workforce Management** projects. No proprietary code or designs are copied — both are built from scratch around a real **Erlang C** staffing engine and statistical + ML forecasting.

| Project | What it is | Stack |
| --- | --- | --- |
| [**`wfm-platform/`**](./wfm-platform) | Production-grade **enterprise WFM SaaS** — full navigable product across 13 modules (Dashboard, Forecasting, Capacity, Erlang, Scheduling, Intraday, Real-Time Monitor, Employees, Skills, PTO, Reports, AI Copilot, Settings/RBAC). | React + TypeScript + Tailwind + shadcn/ui + Recharts (frontend) · FastAPI + SQLAlchemy 2.0 + Postgres + Redis + Celery (backend foundation) |
| [**`wfm-iex/`**](./wfm-iex) | The original **IEX-style prototype** — fast, clickable single-app proof of concept that the platform's domain logic was validated in. | React + Vite + JavaScript |

## What's real here

- **Erlang C engine** — offered load → required agents for a service-level target, with ASA, occupancy, and shrinkage gross-up (no faked staffing numbers).
- **Forecasting** — Seasonal Naïve, Moving Average, Holt-Winters (statistical) + Linear Regression and k-NN (ML), back-tested with **MAPE**; Daily / Weekly / Monthly granularity and date-range planning.
- **Real-time** — Verint-style AUX wallboard with live adherence and AI break-recovery (names agents to recall, escalates to Team Leaders).
- **AI summaries / Copilot** — rule-based analysis over the live plan (deterministic, offline; no LLM key required).

## Run

Each project is self-contained — see its own `README.md`.

```bash
# Enterprise platform (frontend)
cd wfm-platform/frontend && npm install && npm run dev   # http://localhost:5180

# Prototype
cd wfm-iex && npm install && npm run dev                  # http://localhost:5175
```

## Status

- `wfm-platform` frontend: **complete and verified** (13 modules, clean production build). Backend: **Module-1 foundation scaffold** (health endpoints, async DB/session, Celery, modular layout) — feature modules (auth/RBAC, persistence, ML services, RAG) not yet implemented.
- `wfm-iex`: complete prototype.
