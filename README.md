# VestiNex — Incident Intelligence & Deployment Monitoring Platform

> *Who Broke the Build? Every failure leaves a trace.*

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-gray.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-teal.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-56%20Passed-emerald.svg)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-10%20Passed-emerald.svg)](https://playwright.dev/)

**GitHub Repository:** [https://github.com/S-T-HARINI/VestiNex.git](https://github.com/S-T-HARINI/VestiNex.git)

---

## 1. Project Title & Problem Statement

When production outages strike, engineering and SRE teams are forced to manually correlate alerts, CI/CD pipeline runs, Git pull requests, and telemetry logs across disjointed tools. Crucial causal links are obscured by out-of-order log arrival, delayed telemetry ingestion, and teams unknowingly overwriting each other's status notes during high-stress triage.

**VestiNex** is an engineering-first incident intelligence and deployment monitoring platform designed to answer the operational question: **"Who or what broke the build?"**

---

## 2. What VestiNex Does

1. **Reconstructs True Chronological Timelines**: Tracks physical occurrence timestamps (`occurred_at`) separate from database arrival time (`ingested_at`), identifying delayed telemetry and resolving out-of-order events.
2. **Correlates Deployments to Outages**: Analyzes deployments completed within 72 hours of incident onset, scoring temporal proximity confidence (`high`, `medium`, `low`) while upholding the **Evidence Policy**: *Correlation provides an investigative signal; causation requires commit diff verification.*
3. **Fosters Multi-Engineer Investigation Workspaces**: Enables cross-functional collaboration with threaded runbook comments, status transition auditing, engineer assignment, and optimistic concurrency locks.
4. **Delivers Operational Metrics**: Calculates real-time Mean Time to Resolution (MTTR), deployment success rates, severity distribution charts, and recurring incident patterns.
5. **Ingests Real GitHub Commits**: Ingests and displays live commit history from public GitHub repositories with built-in SSRF protection.

---

## 3. Assignment Requirements Feature Mapping

| Assignment Requirement | Implementation in VestiNex | Documentation Link |
| :--- | :--- | :--- |
| **1. Project Management** | Multi-tenant project workspace creation, configuration, public GitHub linking, and scoped RBAC (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`). | [Workflows: Project Lifecycle](docs/application-workflows.md#workflow-a-project-lifecycle) |
| **2. Deployments, Code Changes & Incidents** | Ingestion and tracking of deployments, Git commits, and incidents with full metadata and environment tagging. | [API Reference: Deployments](docs/api-reference.md#5-deployments-apis) |
| **3. Project Event Timeline** | Reconstructed event stream ordered by `occurred_at DESC` with delay detection badges (`+Xs`) and out-of-order filters. | [Workflows: Event Ordering](docs/application-workflows.md#workflow-e-event-ordering-delay-detection--concurrency) |
| **4. Incident Correlation** | Evidence correlation engine evaluating deployments within 72h window with proximity confidence and rationale. | [Workflows: Incident Investigation](docs/application-workflows.md#workflow-d-incident-investigation--correlation) |
| **5. Severity, Status, Assignees & Resolution** | Monotonic incident state machine (`OPEN` → `RESOLVED`), 4-tier severity levels, assignee selection, and mandatory resolution notes. | [API Reference: Incidents](docs/api-reference.md#7-incidents--forensics-apis) |
| **6. Multi-User Updates** | Collaborative incident investigation stream supporting threaded team comments and immutable status audit trails. | [Database Schema: Comments](docs/database-schema.md#411-comments) |
| **7. Dashboard & Recurring Issues** | High-density dashboard with MTTR metrics, deployment volume trends, severity breakdowns, and recurring issue badges. | [API Reference: Dashboard](docs/api-reference.md#9-operational-dashboard-apis) |
| **8. Event Ordering & Concurrency** | Unique constraints for commit/membership deduplication, dual-timestamp ordering, and HTTP `409 Conflict` on simultaneous edits. | [Database Schema: Deduplication](docs/database-schema.md#1-database-architecture-overview) |

---

## 3.1 Platform Bonus Features (End-to-End Implementation)

VestiNex implements **all 5 platform bonus requirements** with zero mock data, full database persistence, and end-to-end integration:

| Bonus Feature | Core Capability | Architectural Enforcement |
| :--- | :--- | :--- |
| **Bonus A: GitHub Webhooks** | Real-time push, deployment, and deployment_status event ingestion. | `POST /api/webhooks/github` with cryptographic HMAC SHA-256 signature verification (`X-Hub-Signature-256`) and delivery deduplication (`X-GitHub-Delivery`). |
| **Bonus B: Real-Time Incident Updates** | Scoped Server-Sent Events (SSE) stream for collaborative triage. | `GET /api/projects/:id/events` authorized with `requireProjectRole('VIEWER')`, 15s keep-alive heartbeat, and live "Live Sync" pulsing status badge. |
| **Bonus C: Complete Role-Based Access Control** | 4-tier scoped authorization (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`). | Backend route middleware returning `HTTP 403 Forbidden` on mutation attempts by Viewers; frontend "Observer Mode" badge with disabled controls. |
| **Bonus D: Event Deduplication & Out-of-Order Handling** | Physical timeline reconstruction and stale update prevention. | Dual timestamp tracking (`occurred_at` vs `ingested_at`), deterministic sorting, `HTTP 409 STALE_EVENT` on out-of-order telemetry, and optimistic locking (`expectedUpdatedAt`). |
| **Bonus E: Audit Logs & Operational History** | Persistent compliance trail with credential sanitization. | `audit_logs` relational table scoped by `project_id`, automatic credential redaction, immutable append-only queries via `GET /api/projects/:id/audit`, and UI Audit Trail viewer. |

### Bonus Feature A — GitHub Webhooks Integration

1. **Endpoint**: `POST /api/webhooks/github`
2. **Signature Verification**: Validates the payload against `GITHUB_WEBHOOK_SECRET` using `crypto.createHmac('sha256', secret)` and `crypto.timingSafeEqual` against the `X-Hub-Signature-256` header.
3. **Delivery Deduplication**: Every delivery ID (`X-GitHub-Delivery`) is recorded in `webhook_deliveries`. Duplicate deliveries are acknowledged with `{ success: true, deduplicated: true }` without redundant processing.
4. **Supported Events**:
   - `push`: Extracts repository commits, verifies project association, and ingests commit records into `code_changes` and `timeline_events`.
   - `deployment`: Records deployment records in `RUNNING` status with git branch, sha, and environment.
   - `deployment_status`: Transitions existing deployments to `SUCCESSFUL` or `FAILED`, logs status transition history, and emits real-time events.
   - `ping`: Verifies webhook setup handshake and logs connection verification.

**Local Testing with cURL**:
```bash
# Calculate HMAC SHA-256 signature for payload
SECRET="your_webhook_secret_here"
PAYLOAD='{"zen":"Practicality beats purity.","hook_id":1}'
SIG="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

curl -X POST http://localhost:4000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -H "X-GitHub-Delivery: delivery-uuid-001" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$PAYLOAD"
```

### Bonus Feature B — Real-Time Incident Updates (Server-Sent Events)

- **SSE Endpoint**: `GET /api/projects/:id/events`
- **Security**: Requires active session and project membership (`VIEWER` or higher). Cross-workspace access is rejected with `HTTP 403`.
- **Heartbeat Ping**: Automatic 15-second heartbeat (`: ping\n\n`) maintains persistent connections across reverse proxies and firewalls.
- **Broadcast Events**:
  - `INCIDENT_CREATED` / `INCIDENT_UPDATED`: Real-time incident metadata changes.
  - `INCIDENT_STATUS_CHANGED`: Live state machine updates (`OPEN` → `INVESTIGATING` → `IDENTIFIED` → `RESOLVED`).
  - `INCIDENT_ASSIGNED`: Immediate lead SRE assignment updates.
  - `COMMENT_ADDED`: Live investigation notes and runbook collaboration.
  - `DEPLOYMENT_LINKED` / `DEPLOYMENT_STATUS_CHANGED`: Live deployment correlation.
- **Frontend Integration**: Built into the Incident Investigation Workspace with a pulsing `Live Sync` indicator. Automatically triggers cache invalidation and re-fetches when events arrive from peer engineers.

### Bonus Feature C — Scoped Role-Based Access Control (RBAC)

| Action | Admin / Owner | Developer / SRE | Viewer / Observer |
| :--- | :---: | :---: | :---: |
| View Project Dashboard, Timeline, Incidents | ✅ | ✅ | ✅ |
| Subscribe to Real-Time SSE Stream | ✅ | ✅ | ✅ |
| Update Incident Status & Resolution Notes | ✅ | ✅ | ❌ *(HTTP 403)* |
| Assign Lead SRE to Incident | ✅ | ✅ | ❌ *(HTTP 403)* |
| Post Investigation Activity Comments | ✅ | ✅ | ❌ *(HTTP 403)* |
| Record New Deployments | ✅ | ✅ | ❌ *(HTTP 403)* |
| Record Code Changes & Sync Commits | ✅ | ✅ | ❌ *(HTTP 403)* |
| Invite Workspace Members & Change Roles | ✅ | ❌ *(HTTP 403)* | ❌ *(HTTP 403)* |
| Modify Project Configuration & Settings | ✅ | ❌ *(HTTP 403)* | ❌ *(HTTP 403)* |

*In the frontend, users with the `VIEWER` role are greeted with an **"Observer Mode (Read-Only)"** banner, and mutation controls (status dropdowns, assignment menus, and comment forms) are cleanly disabled.*

### Bonus Feature D — Event Deduplication & Out-of-Order Handling

- **Database-Level Deduplication**:
  - `webhook_deliveries`: Enforces unique constraint on `delivery_id`.
  - `code_changes`: Enforces unique compound constraint on `(commit_sha, project_id)`. Duplicate commit submissions reject with `HTTP 409 Conflict`.
  - `project_members`: Enforces unique compound constraint on `(project_id, user_id)`.
- **Dual Timestamping**: Every event captures `occurred_at` (telemetry physical creation) and `ingested_at` (database insertion timestamp).
- **Out-of-Order Telemetry Protection**: The incident status machine inspects incoming `occurredAt` timestamps against historical status changes. Out-of-order events timestamped prior to the current state transition are rejected with `HTTP 409 STALE_EVENT`.
- **Optimistic Concurrency**: Mutation requests accept `expectedUpdatedAt`. If another engineer modified the incident concurrently, the update is rejected with `HTTP 409 CONFLICT`, preventing silent overwrites.

### Bonus Feature E — Audit Logs & Compliance Trail

- **Storage**: Project-scoped `audit_logs` table persisting `user_id`, `project_id`, `action`, `entity_type`, `entity_id`, and structured `changes` diffs.
- **Credential Sanitization**: The audit service automatically scrubs sensitive credentials matching `password`, `token`, `secret`, `authorization`, `signature`, and `cookie` prior to serialization.
- **Query API**: `GET /api/projects/:id/audit?entityType=...&entityId=...` allows filtering by operational entity.
- **Project Settings UI**: Displays a dedicated **Audit Trail & Operational History** card in Project Settings with timestamp, actor attribution, entity badges, and expandable JSON change payloads.

---

## 4. Architecture Overview

```mermaid
graph TB
    subgraph Client["Next.js App Router (Port 3000)"]
        UI["Tailwind CSS + shadcn/ui Design System"]
        Theme["ThemeContext (Light / Dark / System Toggle)"]
        Timeline["Chronological Timeline (Linear/GitHub-style)"]
        Workspace["Incident Investigation Workspace"]
        Dashboard["Recharts Observability Dashboard"]
    end

    subgraph Server["Express.js API Server (Port 4000)"]
        ReverseProxy["Next.js /api/* Rewrite Proxy"]
        SessionAuth["Session Middleware & Rate Limiting"]
        RBAC["Project-Scoped RBAC Middleware"]
        Zod["Zod Payload Validation"]
        Services["Project, Deployment, CodeChange, Incident, Timeline Services"]
    end

    subgraph DataTier["Data Persistence Tier"]
        DB[("PostgreSQL 16 Database")]
        Prisma["Prisma ORM 5.22 Schema & DDL"]
        DiskPersistence["Disk Storage Fallback (./pgdata)"]
    end

    Client -->|HTTP + Cookies| ReverseProxy
    ReverseProxy --> Server
    Server --> Prisma
    Prisma --> DB
    Server -.->|Local Dev Zero-Setup| DiskPersistence
```

---

## 5. Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5.7.
- **Styling & UI:** Tailwind CSS, Lucide Icons, shadcn/ui primitives, light/dark/system theme engine.
- **Visualizations:** Recharts 2.15 (Deployment Trends, Severity Distribution).
- **Backend API:** Node.js, Express.js 4.21, TypeScript 5.7 (Layered: Routes, Middleware, Services).
- **Validation:** Zod 3.24.
- **Database:** PostgreSQL 16, Prisma ORM 5.22 (13 relational models, 8 enums, foreign key cascades).
- **Authentication:** Sessions with `express-session`, bcryptjs password hashing (salt rounds: 10), HTTP-only cookies.
- **Testing:** Vitest 2.1, Supertest, Playwright 1.50 (Chromium).
- **DevOps:** Docker, Docker Compose.

---

## 6. Monorepo Repository Structure

```
VestiNex/
├── frontend/                     # Next.js 14 App Router application
│   ├── src/
│   │   ├── app/                  # 17 application routes
│   │   ├── components/           # UI components, layouts, charts, investigation workspace
│   │   │   ├── ThemeToggle.tsx   # Light / Dark / System segmented appearance toggle
│   │   │   └── ui/copy-button.tsx# Tabular commit SHA clipboard copy
│   │   ├── contexts/             # AuthContext and ThemeContext
│   │   └── lib/                  # API client & formatting utilities
│   ├── tailwind.config.ts        # Monochrome engineering design system
│   └── package.json
├── backend/                      # Express.js REST API
│   ├── src/
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # Core business logic layer
│   │   ├── middleware/           # Auth, RBAC, Rate Limiting, Validation, Error Handling
│   │   ├── validators/           # Zod validation schemas
│   │   └── lib/                  # PostgreSQL database client & schema migrations
│   ├── tests/                    # Vitest integration tests (33 tests)
│   └── package.json
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema with 13 models
│   └── seed.ts                   # Database seed script
├── docs/                         # Official project deliverables
│   ├── database-schema.md        # Comprehensive DB schema & Mermaid ER diagram
│   ├── application-workflows.md  # 5 Mermaid workflow diagrams & explanations
│   ├── api-reference.md          # REST API documentation with sample payloads
│   └── assignment-compliance.md  # Detailed requirements traceability matrix
├── e2e/                          # Playwright end-to-end tests (9 tests)
├── docker-compose.yml            # Docker multi-container orchestration
├── .env.example                  # Environment configuration template
└── README.md                     # Platform overview & portfolio documentation
```

---

## 7. Prerequisites

- **Operating System:** Windows 10/11, macOS, or Linux.
- **Node.js:** `v18.18.0` or higher (Node 20+ LTS recommended).
- **Package Manager:** `npm` (v9+).
- **Git:** Installed and available in PATH.
- **Optional:** Docker and Docker Compose (if running via containers).

---

## 8. Installation Instructions

```bash
# 1. Clone repository
git clone https://github.com/S-T-HARINI/VestiNex.git
cd VestiNex

# 2. Configure environment
cp .env.example .env

# 3. Install backend dependencies
cd backend && npm install

# 4. Install frontend dependencies
cd ../frontend && npm install

# 5. Return to root
cd ..
```

---

## 9. Environment Variable Setup

The repository provides a safe template in [`.env.example`](.env.example):

```bash
# Database
POSTGRES_USER=vestinex
POSTGRES_PASSWORD=vestinex_dev_password
POSTGRES_DB=vestinex_db
DATABASE_URL=postgresql://vestinex:vestinex_dev_password@localhost:5432/vestinex_db?schema=public

# Backend
PORT=4000
NODE_ENV=development
SESSION_SECRET=dev-session-entropy-secret-key-321
FRONTEND_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

*Note: In local development, if `DATABASE_URL` is omitted or PostgreSQL is not running locally, VestiNex automatically uses its zero-setup embedded persistent engine at `./pgdata`.*

---

## 10. Database Initialization & Migrations

To apply Prisma migrations against an external PostgreSQL instance:

```bash
cd backend
npx prisma migrate dev
```

To reset or push the schema directly:

```bash
npx prisma db push
```

---

## 11. Seed & Demonstration Data

To populate sample operational projects, deployments, commits, and active incidents:

```bash
cd backend
npm run seed
```

### Pre-Seeded Development Personas

| Persona | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Platform Lead** | System Admin / Owner | `admin@vestinex.io` | `password123` |
| **Staff SRE** | Project Admin / Developer | `dev@vestinex.io` | `password123` |
| **Backend Architect** | Developer | `lead@vestinex.io` | `password123` |
| **Incident Observer** | Read-Only Viewer | `viewer@vestinex.io` | `password123` |

> [!IMPORTANT]
> Fast-login demo buttons are active in development mode (`NODE_ENV !== 'production'`) and automatically disabled in production environments.

---

## 12. Starting Backend & Frontend

Start the servers in two separate terminal windows:

### Terminal 1: Backend API Server
```bash
cd backend
npm run dev
```
*Backend runs on `http://localhost:4000`.*

### Terminal 2: Frontend Web Server
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 13. Application URLs & Health Check

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Direct Backend API:** [http://localhost:4000/api](http://localhost:4000/api)

Expected health check response:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-17T06:17:38.938Z",
  "service": "VestiNex Backend API",
  "version": "1.0.0"
}
```

---

## 14. Running Automated Tests

### 1. Backend Integration Tests (Vitest)
Executes 56 comprehensive API and integration tests covering auth, project isolation, deployment tracking, incident state machines, concurrency locks, GitHub commit ingestion, GitHub webhooks (HMAC & deduplication), real-time SSE streams, RBAC negative tests, out-of-order rejection, and project-scoped audit logs:
```bash
cd backend
npm test
```
**Result:** `56 passed (56 tests across 3 test files: api.test.ts, bonusFeatures.test.ts, githubSync.test.ts)`

### 2. Frontend Production Build (Next.js)
Verifies static page generation, dynamic routing, and TypeScript compilation across all 17 routes:
```bash
cd frontend
npm run build
```
**Result:** `Compiled successfully (17 routes, 0 errors)`

### 3. Playwright End-to-End Tests
Runs automated browser tests against the live application covering landing page, session auth, incident investigation workspace, note creation & real-time relative timestamps, strict project isolation, GitHub commit ingestion, top navigation jump menu, single shared record deploy action, and member invitation modal:
```bash
cd e2e
npx playwright test
```
**Result:** `10 passed (33.4s across Chromium)`

---

## 15. Deliverable Documentation Links

Detailed design, architecture specifications, and technical decisions are located in the repository:

- 📑 **Technical Decisions & Submission Q&A:** [`DECISIONS.md`](DECISIONS.md) *(Approach to technical challenges, SSE vs WebSockets rationale, cross-service boundary limitations, and roadmap)*
- 🗄️ **Database Schema & ER Diagram:** [`docs/database-schema.md`](docs/database-schema.md)
- 🔄 **Application Workflow Diagrams:** [`docs/application-workflows.md`](docs/application-workflows.md)
- 📡 **REST API Reference Specification:** [`docs/api-reference.md`](docs/api-reference.md)
- ✅ **Assignment Compliance Matrix:** [`docs/assignment-compliance.md`](docs/assignment-compliance.md)

---

## 16. Known Limitations & Scope Boundaries

1. **Deployment Execution vs Monitoring**: VestiNex is an observability and correlation platform. It records, tracks, and correlates deployments via its API; it does not compile source code or trigger cloud provisioning directly.
2. **Public vs Private Repositories**: The GitHub commit ingestion engine connects to public GitHub repositories via the unauthenticated GitHub REST API. Private repositories requiring OAuth access tokens are planned for future releases.
3. **Single-Project Correlation Scoping**: Automated incident-to-deployment correlation is evaluated within the active project workspace to enforce strict multi-tenant privacy. Cross-service cascading failures originating across project boundaries require manual repository linking (see [`DECISIONS.md`](DECISIONS.md) Section 3).
4. **Optimistic Locking Scope**: Concurrency checking is applied to incident mutations and status transitions. Deployments utilize monotonic state transitions.

---

## 17. Vercel & Production Deployment Guide

VestiNex is architected as a Next.js 14 frontend and an Express.js / PostgreSQL backend.

### Frontend Deployment on Vercel

The frontend is fully compatible with Vercel:

1. **Import Repository**: In the [Vercel Dashboard](https://vercel.com/new), select the GitHub repository `https://github.com/S-T-HARINI/VestiNex.git`.
2. **Configure Project Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (or Next.js default)
   - **Output Directory**: `.next` (default)
3. **Set Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://your-vestinex-backend.onrender.com
   ```
4. **Deploy**: Click **Deploy**. Vercel will compile the 17 static and dynamic App Router routes.

> [!NOTE]
> **Production Backend & Database Connectivity**: Because the Next.js frontend connects to the Express REST API via `NEXT_PUBLIC_API_URL`, the backend and PostgreSQL database should be hosted on a cloud container provider (e.g., Render, Railway, Fly.io, or AWS ECS) with a managed database (Supabase, Neon, or Railway PostgreSQL) to support live multi-user collaboration in production.
>
> Local Vercel CLI deployment on Windows (`vercel deploy`) requires Administrator / Developer Mode symlink privileges for Next.js serverless function output generation. Standard deployment via Git push to GitHub connected to Vercel is the recommended zero-configuration workflow.

---

## 18. Docker Compose Setup

To orchestrate the full stack (PostgreSQL 16 + Express API + Next.js web) with a single command:

```bash
docker compose up --build
```

Services initialized:
- `postgres`: PostgreSQL 16 on `localhost:5432` with healthcheck.
- `backend`: Express REST API on `localhost:4000`.
- `frontend`: Next.js web application on `localhost:3000`.

To stop the containers:
```bash
docker compose down
```

---

## 19. License

Released under the [MIT License](LICENSE). Built for technical excellence, forensic accuracy, and reliable software delivery.
