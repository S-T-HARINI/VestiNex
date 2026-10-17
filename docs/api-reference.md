# VestiNex — REST API Reference Specification

> Complete documentation of the VestiNex Express.js REST API.
> Standard Base URL: `http://localhost:4000` (or proxied via Next.js at `/api/*`).

---

## 1. Global Conventions & Standards

### Authentication
VestiNex uses secure cookie-based session authentication:
- Cookie Name: `vestinex_sid` (HTTP-only, Lax same-site).
- Auxiliary Cookie: `vestinex_uid` (User ID reference).
- Unauthenticated requests to protected endpoints return `401 Unauthorized`.

### Role-Based Access Control (RBAC)
Project operations enforce role hierarchy:
- `OWNER`: Full administrative rights (archive project, change roles).
- `ADMIN`: Manage members, configure settings.
- `DEVELOPER`: Ingest commits, record deployments, create/update incidents, post comments.
- `VIEWER`: Read-only operational inspection.

Insufficient role permissions return `403 Forbidden`.

### Standard Error Schema
All error responses adhere to the standard JSON structure:
```json
{
  "success": false,
  "error": "Human-readable error description",
  "code": "ERROR_CODE",
  "details": []
}
```

---

## 2. System & Health Endpoints

### `GET /health` & `GET /api/health`
Checks API operational status.

- **Authentication:** None.
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-17T06:17:38.938Z",
  "service": "VestiNex Backend API",
  "version": "1.0.0"
}
```

---

## 3. Authentication & Profile APIs

### `POST /api/auth/register`
Registers a new user account and creates a session.

- **Authentication:** Public (Rate-limited via `authLimiter`).
- **Request Body:**
```json
{
  "email": "engineer@company.com",
  "name": "Alex Taylor",
  "password": "SecurePassword123"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "usr_9f82bc12",
    "email": "engineer@company.com",
    "name": "Alex Taylor",
    "role": "USER",
    "avatarUrl": null,
    "createdAt": "2026-10-17T06:00:00.000Z",
    "updatedAt": "2026-10-17T06:00:00.000Z"
  }
}
```
- **Errors:** `400 Bad Request` (validation error), `409 Conflict` (email already registered).

---

### `POST /api/auth/login`
Authenticates existing credentials and issues a session cookie.

- **Authentication:** Public (Rate-limited).
- **Request Body:**
```json
{
  "email": "admin@vestinex.io",
  "password": "password123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "usr_admin_001",
    "email": "admin@vestinex.io",
    "name": "Sarah Chen (Platform Lead)",
    "role": "ADMIN"
  }
}
```
- **Errors:** `401 Unauthorized` (invalid credentials).

---

### `POST /api/auth/logout`
Destroys the current server-side session and clears session cookies.

- **Authentication:** Public / Authenticated.
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `GET /api/auth/me`
Retrieves the identity and profile of the authenticated user.

- **Authentication:** Required (`authenticate`).
- **Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "usr_admin_001",
    "email": "admin@vestinex.io",
    "name": "Sarah Chen (Platform Lead)",
    "role": "ADMIN",
    "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
  }
}
```
- **Errors:** `401 Unauthorized`.

---

### `PATCH /api/auth/profile`
Updates current user's name or avatar URL.

- **Authentication:** Required.
- **Request Body:**
```json
{
  "name": "Sarah Chen",
  "avatarUrl": "https://example.com/avatar.png"
}
```
- **Response (200 OK):** Returns updated user object.

---

### `GET /api/auth/users`
Lists users in the system for member invitation and incident assignment pickers.

- **Authentication:** Required.
- **Response (200 OK):**
```json
{
  "success": true,
  "users": [
    { "id": "usr_admin_001", "name": "Sarah Chen", "email": "admin@vestinex.io", "avatarUrl": null }
  ]
}
```

---

## 4. Projects & Membership APIs

### `GET /api/projects`
Lists all projects accessible to the authenticated user.

- **Authentication:** Required.
- **Response (200 OK):**
```json
{
  "success": true,
  "projects": [
    {
      "id": "prj_001",
      "name": "Checkout & Payment Engine",
      "description": "Core transaction processing service",
      "repoUrl": "https://github.com/expressjs/express.git",
      "environment": "PRODUCTION",
      "status": "ACTIVE",
      "role": "OWNER",
      "memberCount": 3,
      "incidentCount": 2,
      "deploymentCount": 4
    }
  ]
}
```

---

### `POST /api/projects`
Creates a new project. The creator is automatically assigned the `OWNER` role.

- **Authentication:** Required.
- **Request Body:**
```json
{
  "name": "Order Routing Service",
  "description": "Microservice dispatching warehouse orders",
  "repoUrl": "https://github.com/expressjs/express.git",
  "environment": "PRODUCTION"
}
```
- **Response (201 Created):** Returns created project object.
- **Errors:** `400 Bad Request` (missing or invalid name).

---

### `GET /api/projects/:id`
Retrieves project details, statistics, and configuration.

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Response (200 OK):** Returns project object including `memberCount`, `incidentCount`, `deploymentCount`.
- **Errors:** `404 Not Found`, `403 Forbidden`.

---

### `PATCH /api/projects/:id`
Updates project name, description, repo URL, or target environment.

- **Authentication:** Required (`requireProjectRole('ADMIN')`).
- **Request Body:**
```json
{
  "name": "Order Routing Engine v2",
  "repoUrl": "https://github.com/facebook/react.git"
}
```
- **Response (200 OK):** Returns updated project object.

---

### `POST /api/projects/:id/archive`
Archives a project, marking it inactive.

- **Authentication:** Required (`requireProjectRole('OWNER')`).
- **Response (200 OK):** Returns archived project object with `status: "ARCHIVED"`.

---

### `GET /api/projects/:id/members`
Lists all members and their roles for a project.

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Response (200 OK):**
```json
{
  "success": true,
  "members": [
    { "id": "pm_001", "userId": "usr_admin_001", "role": "OWNER", "user": { "name": "Sarah Chen", "email": "admin@vestinex.io" } }
  ]
}
```

---

### `POST /api/projects/:id/members`
Invites or adds a user to a project.

- **Authentication:** Required (`requireProjectRole('ADMIN')`).
- **Request Body:**
```json
{
  "email": "dev@vestinex.io",
  "role": "DEVELOPER"
}
```
- **Response (201 Created):** Returns new membership record.
- **Errors:** `404 Not Found` (user email does not exist), `409 Conflict` (user already a member).

---

### `PATCH /api/projects/:id/members/:userId`
Updates a member's role within a project.

- **Authentication:** Required (`requireProjectRole('OWNER')`).
- **Request Body:** `{ "role": "ADMIN" }`
- **Response (200 OK):** Returns updated member object.

---

### `DELETE /api/projects/:id/members/:userId`
Removes a member from a project.

- **Authentication:** Required (`requireProjectRole('ADMIN')`).
- **Response (200 OK):** `{ "success": true, "message": "Member removed successfully" }`

---

## 5. Deployments APIs

### `GET /api/projects/:projectId/deployments`
Lists deployments for a project with optional filtering.

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Query Parameters:**
  - `environment` (optional): `DEVELOPMENT`, `STAGING`, `PRODUCTION`
  - `status` (optional): `PENDING`, `RUNNING`, `SUCCESSFUL`, `FAILED`, `ROLLED_BACK`
- **Response (200 OK):**
```json
{
  "success": true,
  "deployments": [
    {
      "id": "dep_001",
      "version": "v2.14.0",
      "environment": "PRODUCTION",
      "commitSha": "f82e14a",
      "branch": "main",
      "status": "SUCCESSFUL",
      "occurredAt": "2026-10-15T06:30:00.000Z",
      "releaseNotes": "Payment settlement batch optimizations"
    }
  ]
}
```

---

### `POST /api/projects/:projectId/deployments`
Records a deployment event.

- **Authentication:** Required (`requireProjectRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "environment": "PRODUCTION",
  "version": "v2.15.0",
  "commitSha": "a1b2c3d",
  "branch": "main",
  "status": "SUCCESSFUL",
  "occurredAt": "2026-10-17T06:00:00.000Z",
  "buildUrl": "https://ci.company.com/build/1042",
  "releaseNotes": "Upgraded connection pooling"
}
```
- **Response (201 Created):** Returns created deployment record.

---

### `GET /api/deployments/:id`
Retrieves full details of a deployment, associated commit changes, and status history.

- **Authentication:** Required (`requireDeploymentRole('VIEWER')`).
- **Response (200 OK):** Returns deployment object with `statusHistory` and `codeChanges`.

---

### `PATCH /api/deployments/:id/status`
Transitions a deployment's lifecycle status with an operational audit note.

- **Authentication:** Required (`requireDeploymentRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "status": "ROLLED_BACK",
  "note": "Rolled back due to error rate breach on settle endpoint"
}
```
- **Response (200 OK):** Returns updated deployment object.

---

### `GET /api/deployments/:id/history`
Returns the status history trail for a deployment.

- **Authentication:** Required (`requireDeploymentRole('VIEWER')`).
- **Response (200 OK):** Returns array of `DeploymentStatusHistory` items.

---

## 6. Code Changes & GitHub Ingestion APIs

### `GET /api/projects/:projectId/code-changes`
Lists code changes and Git commits recorded for a project.

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Response (200 OK):**
```json
{
  "success": true,
  "codeChanges": [
    {
      "id": "chg_001",
      "commitSha": "f82e14a2b3",
      "message": "fix(db): optimize connection pool timeout",
      "author": "Sarah Chen",
      "committedAt": "2026-10-15T06:15:00.000Z",
      "repoUrl": "https://github.com/expressjs/express.git"
    }
  ]
}
```

---

### `POST /api/projects/:projectId/code-changes`
Manually records a code change via API.

- **Authentication:** Required (`requireProjectRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "commitSha": "d98e71a",
  "message": "feat: add payment idempotency keys",
  "author": "Sarah Chen <sarah@vestinex.io>",
  "committedAt": "2026-10-17T05:30:00.000Z",
  "branch": "main",
  "filesChanged": "src/settle.ts, src/db.ts"
}
```
- **Response (201 Created):** Returns created `CodeChange` record.
- **Errors:** `409 Conflict` (commitSha already exists for project).

---

### `POST /api/projects/:projectId/code-changes/sync`
Synchronizes real commit history from the project's saved public GitHub repository URL.

- **Authentication:** Required (`requireProjectRole('DEVELOPER')`).
- **Request Body:** Empty `{}`.
- **Response (200 OK):**
```json
{
  "success": true,
  "syncedCount": 30,
  "totalCommits": 30,
  "repository": "expressjs/express",
  "message": "Successfully synchronized 30 commits from expressjs/express"
}
```
- **Errors:** `400 Bad Request` (project has no repoUrl or invalid format), `403 Forbidden` (SSRF violation).

---

## 7. Incidents & Forensics APIs

### `GET /api/projects/:projectId/incidents`
Lists incidents for a project with optional filters.

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Query Parameters:**
  - `severity` (optional): `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `status` (optional): `OPEN`, `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`, `CLOSED`
- **Response (200 OK):** Returns array of incident summaries with `commentCount` and `linkedDeploymentCount`.

---

### `POST /api/projects/:projectId/incidents`
Registers a new incident and initiates the investigation workflow.

- **Authentication:** Required (`requireProjectRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "title": "Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint",
  "description": "502 Bad Gateway rate surged to 18.4% immediately following evening release.",
  "severity": "CRITICAL",
  "status": "OPEN",
  "occurredAt": "2026-10-17T06:05:00.000Z",
  "assignedToId": "usr_admin_001"
}
```
- **Response (201 Created):** Returns created incident object.

---

### `GET /api/incidents/:id`
Retrieves incident investigation workspace data, including:
- Reported by and Assignee user details
- Comments stream
- Status history trail
- Explicitly linked deployments
- **Suggested correlation leads** with temporal proximity confidence (`high`, `medium`, `low`) and forensic rationale.

- **Authentication:** Required (`requireIncidentRole('VIEWER')`).
- **Response (200 OK):** Returns complete incident investigation payload.

---

### `PATCH /api/incidents/:id`
Updates incident metadata (title, description, severity, assignee) with optimistic concurrency support.

- **Authentication:** Required (`requireIncidentRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "title": "Updated incident title",
  "severity": "HIGH",
  "expectedUpdatedAt": "2026-10-17T06:05:00.000Z"
}
```
- **Response (200 OK):** Returns updated incident.
- **Errors:** `409 Conflict` (if `expectedUpdatedAt` does not match database).

---

### `PATCH /api/incidents/:id/status`
Transitions an incident through its investigation lifecycle.

- **Authentication:** Required (`requireIncidentRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "note": "Pool connections recycled; hotfix deployed",
  "resolutionNote": "Root cause was database connection pool exhaustion caused by missing timeout parameter.",
  "expectedUpdatedAt": "2026-10-17T06:05:00.000Z"
}
```
- **Response (200 OK):** Returns updated incident with `resolvedAt` set.
- **Errors:** `400 Bad Request` (resolving without resolution note), `409 Conflict` (concurrent update conflict).

---

### `POST /api/incidents/:id/assign`
Assigns an incident to an engineer.

- **Authentication:** Required (`requireIncidentRole('DEVELOPER')`).
- **Request Body:** `{ "assignedToId": "usr_dev_002" }`
- **Response (200 OK):** Returns updated incident.

---

### `POST /api/incidents/:id/link-deployment`
Correlates a suspect deployment as forensic evidence.

- **Authentication:** Required (`requireIncidentRole('DEVELOPER')`).
- **Request Body:**
```json
{
  "deploymentId": "dep_001",
  "confidence": "high",
  "note": "Deployment completed 5 minutes prior to 502 spike"
}
```
- **Response (200 OK):** Returns created link record.
- **Errors:** `409 Conflict` (deployment already linked to this incident).

---

### `DELETE /api/incidents/:id/link-deployment/:deploymentId`
Removes an evidence link between an incident and deployment.

- **Authentication:** Required (`requireIncidentRole('DEVELOPER')`).
- **Response (200 OK):** `{ "success": true, "message": "Deployment unlinked successfully" }`

---

### `GET /api/incidents/:id/comments` & `POST /api/incidents/:id/comments`
Fetches comments or posts a new comment on an incident.

- **Authentication:** Required (`DEVELOPER` to post, `VIEWER` to read).
- **Post Request Body:** `{ "content": "Database CPU spiked to 98% during the settlement batch run." }`
- **Response (201 Created):** Returns created comment with author user metadata.

---

## 8. Unified Chronological Timeline APIs

### `GET /api/projects/:id/timeline`
Reconstructs the project-wide chronological event stream based on true occurrence timestamps (`occurred_at DESC`).

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Query Parameters:**
  - `type` (optional): Filter by `TimelineEventType`.
  - `delayedOnly` (optional, boolean): Filter only events with telemetry ingestion lag > 60 seconds.
  - `outOfOrderOnly` (optional, boolean): Filter only out-of-order events (lag > 300 seconds).
- **Response (200 OK):**
```json
{
  "success": true,
  "events": [
    {
      "id": "tle_001",
      "type": "INCIDENT_CREATED",
      "title": "CRITICAL Incident: Elevated 502 Bad Gateway Spike",
      "description": "502 Bad Gateway rate surged to 18.4%",
      "occurredAt": "2026-10-15T06:35:00.000Z",
      "ingestedAt": "2026-10-15T06:35:03.200Z",
      "delaySeconds": 3,
      "isDelayed": false,
      "isOutOfOrder": false,
      "metadata": { "severity": "CRITICAL", "status": "OPEN" }
    }
  ]
}
```

---

## 9. Operational Dashboard APIs

### `GET /api/projects/:id/dashboard`
Computes operational observability metrics for a specific project.

- **Authentication:** Required (`requireProjectRole('VIEWER')`).
- **Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalIncidents": 5,
    "openIncidents": 1,
    "mttrMinutes": 42,
    "deploymentSuccessRate": 88.5,
    "recurringIssuesCount": 2,
    "trendData": [
      { "date": "2026-10-10", "incidents": 1, "deployments": 2 }
    ],
    "severityDistribution": {
      "CRITICAL": 1,
      "HIGH": 2,
      "MEDIUM": 1,
      "LOW": 1
    }
  }
}
```

---

### `GET /api/dashboard/overview`
Aggregates operational metrics across all projects accessible to the user.

- **Authentication:** Required.
- **Response (200 OK):** Returns global summary statistics, cross-project severity distributions, and active incident counts.

---

### `GET /api/dashboard/audit`
Lists mutation audit logs across user's authorized projects.

- **Authentication:** Required.
- **Query Parameters:** `entityType` (optional), `entityId` (optional).
- **Response (200 OK):** Returns array of `AuditLog` records with user, action, and JSON changes.
