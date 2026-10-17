# Architecture & Technical Design Decisions — VestiNex

This document details the core architectural challenges, design choices, system limitations, and roadmap considerations encountered during the engineering of **VestiNex — Who Broke the Build?**

---

### 1. What was the most technically challenging part of the implementation, and how did you approach it?

The most demanding technical challenge was **Dual-Timestamp Forensic Event Reconstruction and Telemetry Lag Analysis**.

In real-world microservices and observability pipelines, log forwarders (FluentBit, Logstash), message queues (Kafka), and CI/CD pipelines introduce variable buffering delays and network jitter. Consequently, an incident alert triggered at `10:14:00 UTC` might arrive in the monitoring database *before* or *after* a deployment payload that completed at `10:10:00 UTC` but sat in a forwarder queue until `10:15:30 UTC`. If a timeline sorts events purely by when records were inserted into the database (`ingested_at`), cause and effect appear reversed.

**Our Approach:**
1. **Explicit Dual-Timestamp Architecture**: We decoupled physical occurrence time (`occurred_at`) from ingestion time (`ingested_at`) across all core schemas (`deployments`, `incidents`, `timeline_events`, `code_changes`).
2. **True-Chronology Sorting**: The timeline engine queries records ordered strictly by `occurred_at DESC, ingested_at DESC, id DESC`. This guarantees the true historical sequence on the timeline regardless of payload arrival order.
3. **Automated Telemetry Lag Detection**: When assembling the project timeline in `timeline.service.ts`, each record is evaluated dynamically:
   $$\text{delaySeconds} = \max(0, \lfloor(\text{ingested\_at} - \text{occurred\_at}) / 1000\rfloor)$$
   - Events with $\text{delaySeconds} > 60\text{s}$ are classified and badged as **Delayed Telemetry**.
   - Events with $\text{delaySeconds} > 300\text{s}$ are flagged as **Out-of-Order Ingestion**, warning on-call responders that telemetry buffering masked the causal sequence.
4. **Temporal Proximity Correlation**: Rather than claiming correlation equals causation, `incident.service.ts` runs a multi-tier temporal scan of candidate deployments completed within 72 hours before the incident onset:
   - High Confidence: Finished $\le 120$ minutes before incident onset.
   - Medium Confidence: Finished between $2$ and $24$ hours before incident onset.
   - Low Confidence: Finished between $24$ and $72$ hours before incident onset.
   Each suggested link surfaces a clear forensic rationale and links to Git commit diffs for human validation.

---

### 2. Describe one important design decision you made, and why you chose that approach over alternatives.

**Decision: Using Server-Sent Events (SSE) with In-Memory Channel Pub/Sub for Live Collaboration instead of WebSockets or Client Polling.**

When investigating a Sev-1 production failure, multiple on-call engineers may update workflow statuses, add investigative notes, or link candidate deployments simultaneously. We required a real-time mechanism to propagate changes to active browser tabs instantly.

**Why SSE over WebSockets:**
- **Simplicity and Unidirectional Fit**: Incident investigation updates are primarily server-to-client broadcasts (status changes, newly linked deployments, team hypotheses). Complex bidirectional state machines like WebSocket handshakes and binary framing were unnecessary overhead.
- **Native HTTP/2 & Firewall Compatibility**: SSE operates over standard HTTP (`text/event-stream`), traversing corporate proxies, VPNs, and CDNs without needing WebSocket protocol upgrades (`101 Switching Protocols`) or custom socket port permissions.
- **Built-in Browser Reconnection**: The native `EventSource` API handles reconnection and backoff automatically, maintaining clean state across transient network blips.

**Why SSE over Periodic Client Polling:**
- Polling introduces latency (e.g., waiting 5–10 seconds for the next interval) or floods the database with redundant queries during low-activity periods.
- SSE provides immediate (<50ms) push latency when an SRE submits a hypothesis, while consuming negligible server resources when the channel is idle.

In `realtime.service.ts`, we implemented topic-scoped channels (`incident:${incidentId}`), broadcasting lightweight JSON payloads (`status_changed`, `comment_added`, `deployment_linked`) that trigger instant cache revalidations on connected clients.

---

### 3. What is one limitation or failure case the current implementation does not handle well?

**Limitation: Strict Single-Project Scoping for Root-Cause Correlation (Cross-Service Dependency Blindness).**

Currently, VestiNex enforces rigorous project and workspace isolation (`WHERE project_id = $1`). While this provides essential multi-tenant privacy and prevents unauthorized data leaks between teams, it introduces an investigative limitation in modern microservice architectures: **inter-service cascading failures**.

**The Failure Scenario:**
- Team A maintains the `Checkout & Payment Engine` project.
- Team B maintains the `Auth & Token Service` project.
- Team B deploys version `v1.8.2` containing a subtle JWT expiry change. Five minutes later, the Payment Engine experiences an elevated HTTP 502 spike because token validation calls fail.
- Because VestiNex evaluates deployment correlation candidates strictly within the active project scope (`project.id`), the correlation engine will *not* automatically flag Team B's deployment as a candidate lead for Team A's incident, unless an engineer manually adds Team B's repository or cross-references the workspaces.

If a failure originates from an upstream or downstream service across different project workspaces, the automated correlation engine cannot surface that cross-boundary lead without manual intervention.

---

### 4. If you had another week to work on the project, what would you improve first and why?

**First Improvement: Upstream/Downstream Service Dependency Graphs and OpenTelemetry Distributed Trace Ingestion.**

If given additional development time, our top priority would be bridging the cross-project gap by introducing a lightweight **Service Dependency Graph** and **Trace ID Correlation**:

1. **Service Dependency Declarations**:
   - Allow projects to declare known upstream and downstream dependencies (e.g., `Payment Engine` $\rightarrow$ depends on $\rightarrow$ `Auth Service`, `Database Replica`).
   - When an incident occurs in a downstream project, expand the temporal correlation window to scan candidate deployments from linked upstream dependencies as secondary correlation leads.
2. **OpenTelemetry (OTel) Span Correlation**:
   - Accept standard W3C `traceparent` or OpenTelemetry trace headers alongside incident payloads.
   - When an incident is logged with an error trace ID, match the trace's failing spans against recently deployed service versions across all connected project boundaries.
3. **Automated Rollback Webhook Triggers**:
   - Add a verified, role-gated "Trigger Canary Rollback" button in the Investigation Workspace that dispatches a cryptographically signed webhook to GitHub Actions, ArgoCD, or GitLab CI to trigger an immediate rollback when an SRE confirms a high-confidence correlation.

**Why this matters first:** In enterprise engineering environments, outages rarely stay confined to a single monolithic repository. Enabling cross-service causality tracking elevates VestiNex from a single-service monitor to an end-to-end incident command center.
