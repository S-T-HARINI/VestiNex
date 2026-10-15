# VestiNex Architecture Documentation

> *Every failure leaves a trace.*

## 1. System Overview

VestiNex is an incident intelligence and deployment monitoring platform designed for engineering teams investigating production outages. It solves the fragmentation problem between CI/CD deployment pipelines, source control commits, application telemetry streams, and incident response tracking.

```
┌────────────────────────────────────────────────────────┐
│               Frontend: Next.js App Router             │
│   (Tailwind CSS, shadcn/ui, Recharts, Tabular Fonts)   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP /api/* (Cookies + Session)
┌──────────────────────────▼─────────────────────────────┐
│               Backend: Express.js + TypeScript          │
│   (Zod Validation, Session Auth, RBAC, Rate Limiting)  │
└──────────────────────────┬─────────────────────────────┘
                           │
        ┌──────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│ External PostgreSQL Server│       │ In-Process PostgreSQL 16  │
│ (Production Docker/Cloud) │       │ (PGlite Engine on Disk)   │
└───────────────────────────┘       └───────────────────────────┘
               │                                   │
               └─────────► Prisma DDL ◄────────────┘
                     (Tables, Enums, Indexes)
```

---

## 2. Forensic Event Reconstruction & Telemetry Lag

Traditional dashboards record an event timestamp based solely on when an alert or log arrived at the logging agent (`ingestedAt`). In high-load or degraded environments, network buffers, log forwarders, and message queues introduce significant latency.

VestiNex records both dimensions:
- `occurredAt`: The precise moment an event occurred inside the runtime system.
- `ingestedAt`: The moment the telemetry event was persisted into VestiNex.

### Out-of-Order Log Highlighting
When an incident occurs, logs from upstream dependencies often arrive late due to network queue saturation. If an event occurred earlier than preceding items in the ingested stream, VestiNex highlights it as an **Out-of-Order Ingestion** event, restoring the true causal sequence to the incident commander.

---

## 3. Evidence-Based Deployment Correlation

VestiNex correlates incidents with candidate deployments without falling into the logical fallacy that correlation proves causation:
1. **Temporal Proximity Scan**: Evaluates deployments that completed within a 72-hour window preceding the incident's `occurredAt`.
2. **Confidence Heuristic**:
   - `high`: Deployment finished within 120 minutes of incident onset in the same environment.
   - `medium`: Deployment finished within 24 hours.
   - `low`: Deployment finished within 72 hours.
3. **Forensic Traceability**: Engineers must verify commit diffs before triggering a rollback. Every link records an audit note and confidence level.

---

## 4. Role-Based Access Control (RBAC)

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| **OWNER** | Project | Full control, edit project, archive, manage members & roles, delete |
| **ADMIN** | Project | Add members, create deployments, create incidents, edit status |
| **DEVELOPER** | Project | Record deployments, push commits, open incidents, add comments |
| **VIEWER** | Project | Read-only inspection of dashboards, timelines, and incident workspaces |
| **SYSTEM ADMIN** | Global | Unrestricted access across all projects, users, and audit logs |

---

## 5. Security & Data Integrity

- **Password Storage**: Hashed using `bcryptjs` with salt rounds = 10.
- **Session Security**: Session cookies with `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- **Session Fixation Mitigation**: Session regeneration on login.
- **Input Sanitization**: Strict Zod schemas on every request payload.
- **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts (20 requests per 15 min on auth routes).
- **Idempotency & Conflict Handling**: Duplicate commit ingestion returns HTTP 409 Conflict. Simultaneous incident updates evaluate `expectedUpdatedAt` timestamps and reject stale collisions with HTTP 409 Conflict.
- **Demo Access Guard**: Fast one-click credentials are strictly rendered in development mode (`process.env.NODE_ENV !== 'production'`).
