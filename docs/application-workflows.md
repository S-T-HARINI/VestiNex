# VestiNex — Application Workflow Diagrams

> Formal architectural documentation detailing end-to-end system workflows, data transitions, participating frontend pages, Express services, and PostgreSQL models in VestiNex.

---

## Workflow A: Project Lifecycle

This workflow governs user onboarding, authentication, isolated workspace project creation, configuration (such as public Git repository linking), and ongoing project operations.

```mermaid
sequenceDiagram
    autonumber
    actor User as Engineer / SRE
    participant Web as Next.js Web UI
    participant Auth as Auth Middleware & Router
    participant ProjSvc as ProjectService
    participant DB as PostgreSQL Database

    User->>Web: Navigate to /login or /register
    Web->>Auth: POST /api/auth/register or POST /api/auth/login
    Auth->>DB: Query user / Verify bcrypt hash
    DB-->>Auth: User record verified
    Auth-->>Web: Set httpOnly session cookie & return User
    Web->>User: Redirect to /dashboard

    User->>Web: Click "New Project" (/projects/new)
    Web->>ProjSvc: POST /api/projects { name, description, repoUrl, environment }
    Note over ProjSvc: Zod validation: createProjectSchema<br/>Validate project name & repo URL
    ProjSvc->>DB: BEGIN Transaction
    ProjSvc->>DB: INSERT INTO projects (...)
    ProjSvc->>DB: INSERT INTO project_members (userId, projectId, role='OWNER')
    ProjSvc->>DB: INSERT INTO timeline_events (type='PROJECT_CREATED')
    ProjSvc->>DB: INSERT INTO audit_logs (action='PROJECT_CREATE')
    ProjSvc->>DB: COMMIT Transaction
    DB-->>ProjSvc: Project created
    ProjSvc-->>Web: HTTP 201 Created { success: true, project }
    Web->>User: Navigate to /projects/:id
```

### Technical Details
- **Frontend Pages:** `/login`, `/register`, `/dashboard`, `/projects/new`, `/projects/:id/settings`.
- **Backend APIs & Services:** 
  - `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
  - `POST /api/projects`, `GET /api/projects/:id`, `PATCH /api/projects/:id`, `POST /api/projects/:id/archive`.
  - [`projectService`](file:///d:/projects/VestiNex/backend/src/services/project.service.ts), [`authService`](file:///d:/projects/VestiNex/backend/src/services/auth.service.ts).
- **Database Models:** `User`, `Project`, `ProjectMember`, `TimelineEvent`, `AuditLog`.
- **Validation & Error Handling:**
  - Name is required (1-100 characters).
  - Multi-tenant data isolation: Each user only sees projects they own or are invited to. Unauthorized requests return `403 Forbidden` via `requireProjectRole`.

---

## Workflow B: Code Change Ingestion

This workflow covers ingesting Git commits from configured public GitHub repositories or recording individual changes via the developer API, validating metadata, deduplicating SHAs, and publishing to the project timeline.

```mermaid
flowchart TD
    Start([Engineer or Auto-Sync Trigger]) --> UI["/projects/:id/code-changes (Web UI)"]
    UI -->|Click 'Sync Commits'| API["POST /api/projects/:id/code-changes/sync"]
    
    subgraph IngestionEngine["Backend Ingestion Engine"]
        ValidateReq["Validate Session & DEVELOPER Role"] --> CheckRepo["Fetch project.repo_url from DB"]
        CheckRepo --> HasRepo{"repoUrl configured?"}
        HasRepo -- No --> ErrNoRepo["HTTP 400: Project has no repoUrl configured"]
        HasRepo -- Yes --> ExtractSlug["Extract GitHub owner/repo slug & validate against SSRF"]
        ExtractSlug --> FetchAPI["Query GitHub REST API /repos/:owner/:repo/commits"]
        FetchAPI --> ParseCommits["Parse commit SHA, message, author, committed_at"]
        ParseCommits --> Dedup["PostgreSQL Upsert / ON CONFLICT (commit_sha, project_id) DO NOTHING"]
    end

    Dedup --> DB[("PostgreSQL 16: code_changes")]
    DB --> InsertTimeline["Record TIMELINE_EVENT (CODE_CHANGE_RECORDED)"]
    InsertTimeline --> Resp["HTTP 200 { syncedCount, totalCommits }"]
    Resp --> UI
    UI --> UpdateView["Render tabular commits stream with copyable SHAs"]
```

### Technical Details
- **Frontend Pages:** `/projects/:id/code-changes`, `/projects/:id/timeline`.
- **Backend APIs & Services:** 
  - `POST /api/projects/:id/code-changes/sync`: Ingests the latest 30 commits from GitHub.
  - `POST /api/projects/:id/code-changes`: Manual API commit recording.
  - `GET /api/projects/:id/code-changes`: Retrieves commit history.
  - [`codeChangeService`](file:///d:/projects/VestiNex/backend/src/services/codeChange.service.ts).
- **Database Models:** `CodeChange`, `Project`, `TimelineEvent`, `AuditLog`.
- **Validation & Error Handling:**
  - Strict SSRF protection ensures only valid public GitHub URLs (`github.com/owner/repo`) are accepted; private network addresses (`localhost`, `127.0.0.1`, `169.254.169.254`) are blocked.
  - Deduplication is guaranteed via PostgreSQL unique constraint `@@unique([commit_sha, project_id])`. Duplicate commits are skipped idempotently without throwing errors.

---

## Workflow C: Deployment Recording

This workflow documents how deployments are recorded in VestiNex. 

> [!NOTE]
> **Manual vs Automated Recording**: VestiNex currently provides a **recording and monitoring API** (`POST /api/projects/:id/deployments` and status transitions) intended for CI/CD integration (e.g. GitHub Actions, GitLab CI, ArgoCD webhook). VestiNex does *not* execute build binaries or cloud infrastructure rollouts itself; it tracks, logs, and correlates them.

```mermaid
sequenceDiagram
    autonumber
    actor CI as CI/CD Pipeline or SRE
    participant Web as Next.js Web UI (/deployments/new)
    participant DepRoute as Deployment Router
    participant DepSvc as DeploymentService
    participant DB as PostgreSQL Database

    CI->>DepRoute: POST /api/projects/:id/deployments
    Note over DepRoute: Zod validation: createDeploymentSchema<br/>environment, version, commitSha, branch, occurredAt
    DepRoute->>DepSvc: createDeployment(userId, projectId, payload)
    
    DepSvc->>DB: BEGIN Transaction
    DepSvc->>DB: INSERT INTO deployments (status='PENDING' or status='SUCCESSFUL')
    DepSvc->>DB: INSERT INTO deployment_status_history (to_status=status)
    DepSvc->>DB: INSERT INTO timeline_events (type='DEPLOYMENT_CREATED', occurred_at=payload.occurredAt)
    DepSvc->>DB: INSERT INTO audit_logs (action='DEPLOYMENT_CREATE')
    DepSvc->>DB: COMMIT Transaction
    
    DB-->>DepSvc: Deployment saved
    DepSvc-->>DepRoute: Deployment record with IDs
    DepRoute-->>CI: HTTP 201 Created { success: true, deployment }

    opt Later Pipeline Status Transition (e.g. Rollback or Failed)
        CI->>DepRoute: PATCH /api/deployments/:id/status { status: 'ROLLED_BACK', note: 'Canary alerts triggered' }
        DepRoute->>DepSvc: updateDeploymentStatus(userId, id, newStatus, note)
        DepSvc->>DB: UPDATE deployments SET status = $1
        DepSvc->>DB: INSERT INTO deployment_status_history (...)
        DepSvc->>DB: INSERT INTO timeline_events (type='DEPLOYMENT_STATUS_CHANGED')
        DepSvc-->>CI: HTTP 200 OK { success: true, deployment }
    end
```

### Technical Details
- **Frontend Pages:** `/projects/:id/deployments`, `/projects/:id/deployments/new`, `/projects/:id/deployments/:deploymentId`.
- **Backend APIs & Services:** 
  - `POST /api/projects/:id/deployments`: Register deployment.
  - `PATCH /api/deployments/:id/status`: Transition lifecycle status (`PENDING` → `RUNNING` → `SUCCESSFUL` / `FAILED` / `ROLLED_BACK`).
  - `GET /api/deployments/:id/history`: Audit trail of deployment status changes.
  - [`deploymentService`](file:///d:/projects/VestiNex/backend/src/services/deployment.service.ts).
- **Database Models:** `Deployment`, `DeploymentStatusHistory`, `TimelineEvent`, `AuditLog`.
- **Validation & Error Handling:**
  - `environment` must match enum `DEVELOPMENT`, `STAGING`, `PRODUCTION`.
  - `occurredAt` defaults to current timestamp if omitted, but accepts historical timestamps for out-of-order CI/CD event ingestion.

---

## Workflow D: Incident Investigation & Correlation

This workflow guides SREs and developers from incident registration through temporal correlation analysis, evidence linking, team discussion, and final post-mortem resolution.

```mermaid
flowchart TD
    A["Incident Reported<br/>POST /api/projects/:id/incidents"] --> B["Record Incident in DB<br/>Status: OPEN, Severity: CRITICAL"]
    B --> C["Generate Timeline Event<br/>INCIDENT_CREATED"]
    C --> D["Compute Correlation Leads<br/>Deployments within -72h"]
    
    subgraph EvidenceEngine["Evidence-Based Correlation Engine"]
        D --> E{"Deployment Time Window"}
        E -->|0 to 2 hours before| F["High Confidence Lead<br/>Direct Temporal Proximity"]
        E -->|2 to 24 hours before| G["Medium Confidence Lead<br/>Intermediate Window"]
        E -->|24 to 72 hours before| H["Low Confidence Lead<br/>Delayed Manifestation"]
        F & G & H --> I["Apply Evidence Policy:<br/>'Correlation provides investigative signal;<br/>causation requires commit diff verification.'"]
    end

    I --> J["Investigation Workspace<br/>/projects/:id/incidents/:incidentId"]
    J -->|Engineer reviews suspect deployment| K["Link Evidence<br/>POST /api/incidents/:id/link-deployment"]
    J -->|Collaborate| L["Post Analysis Comment<br/>POST /api/incidents/:id/comments"]
    J -->|Transition State| M["Update Status<br/>INVESTIGATING → IDENTIFIED → RESOLVED"]
    M --> N["Save Resolution Note & Record INCIDENT_RESOLVED"]
```

### Technical Details
- **Frontend Pages:** `/projects/:id/incidents`, `/projects/:id/incidents/new`, `/projects/:id/incidents/:incidentId`.
- **Backend APIs & Services:** 
  - `POST /api/projects/:id/incidents`, `GET /api/incidents/:id`, `PATCH /api/incidents/:id/status`.
  - `POST /api/incidents/:id/link-deployment`, `DELETE /api/incidents/:id/link-deployment/:deploymentId`.
  - `POST /api/incidents/:id/comments`, `POST /api/incidents/:id/assign`.
  - [`incidentService`](file:///d:/projects/VestiNex/backend/src/services/incident.service.ts).
- **Database Models:** `Incident`, `IncidentStatusHistory`, `IncidentDeploymentLink`, `Comment`, `TimelineEvent`, `AuditLog`.
- **Validation & Error Handling:**
  - Severity must be one of `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
  - Status follows monotonic progression; marking `RESOLVED` requires a non-empty `resolutionNote`.
  - Linking a deployment is protected by unique constraint `@@unique([incident_id, deployment_id])` preventing duplicate correlations.

---

## Workflow E: Event Ordering, Delay Detection & Concurrency

This workflow illustrates how VestiNex handles out-of-order events, network ingestion lag, and simultaneous user edits on the same incident.

```mermaid
flowchart TD
    subgraph TelemetryIngestion["Telemetry Ingestion & Latency Analysis"]
        EventIn["Event Received<br/>(occurred_at: T_occur, ingested_at: T_now)"]
        EventIn --> CalcLag["Compute delaySeconds = T_now - T_occur"]
        CalcLag --> LagCheck{"delaySeconds > 60s?"}
        LagCheck -- Yes --> MarkDelayed["Flag: isDelayed = true<br/>Badge: Delayed Telemetry (+Xs)"]
        LagCheck -- No --> MarkNormal["Flag: isDelayed = false<br/>Normal Ingestion"]
        MarkDelayed --> OrderCheck{"delaySeconds > 300s?"}
        OrderCheck -- Yes --> MarkOOO["Flag: isOutOfOrder = true<br/>Badge: Out-of-Order Ingestion"]
        OrderCheck -- No --> TimelineStream
        MarkNormal --> TimelineStream
        MarkOOO --> TimelineStream["Sort stream by occurred_at DESC<br/>(True Chronological Reconstruction)"]
    end

    subgraph ConcurrencyControl["Optimistic Concurrency Control (HTTP 409)"]
        UserA["User A starts editing Incident (reads updated_at = T0)"]
        UserB["User B submits status update (writes updated_at = T1)"]
        UserA -->|Submits update with expectedUpdatedAt = T0| ServerCheck{"DB updated_at == T0?"}
        UserB -.->|Updates DB first| DBRecord[("DB incident record")]
        DBRecord -.-> ServerCheck
        ServerCheck -- "Mismatch (|T1 - T0| > 1s)" --> ConflictErr["HTTP 409 Conflict<br/>'Incident was updated by another team member.<br/>Please refresh.'"]
        ServerCheck -- "Match" --> CommitUpdate["Update incident & bump updated_at"]
    end
```

### Technical Details
- **Frontend Pages:** `/projects/:id/timeline`, `/projects/:id/incidents/:incidentId`.
- **Backend APIs & Services:** 
  - `GET /api/projects/:id/timeline?delayedOnly=true&outOfOrderOnly=true`.
  - `PATCH /api/incidents/:id` & `PATCH /api/incidents/:id/status`.
  - [`timelineService`](file:///d:/projects/VestiNex/backend/src/services/timeline.service.ts).
- **Database Models:** `TimelineEvent`, `Incident`.
- **Validation & Error Handling:**
  - Events are sorted by physical `occurred_at DESC` rather than database arrival order, guaranteeing correct forensic event order.
  - Telemetry delay is computed and surfaced in UI badges (`+Xs`).
  - Concurrent modifications with stale `expectedUpdatedAt` trigger immediate HTTP `409 Conflict`, shielding data from accidental race conditions.
