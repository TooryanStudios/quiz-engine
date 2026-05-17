# ToorGen Implementation Plan (Industry-Standard Remediation)

## 1) Scope and Goals

This plan implements the fixes defined in the risk and architecture reports and delivers a production-grade ToorGen platform with:

- Secure-by-default APIs and data access
- Queue-driven and idempotent generation workflows
- Strong subsystem boundaries for text, image, video, and audio
- Accurate, server-authoritative task state and auditability
- Credit, points, and payment systems with financial correctness
- Full observability, SLOs, and incident readiness

In scope:

- Frontend and backend ToorGen flows
- Provider adapters and orchestration
- Storage, retention, and compliance controls
- Billing, credits, ledger, and payment gateway webhooks
- CI/CD, release controls, and operational runbooks

Out of scope for this plan:

- WorkHub feature redesign
- Quiz gameplay feature expansion unrelated to ToorGen reliability/security

## 2) Operating Principles

- Security first: least privilege, strict ownership checks, and defense in depth
- Server authority: frontend never invents generation state
- Idempotency everywhere: submissions, provider calls, and webhook processing
- Event-driven execution: async queues for long-running jobs
- Financial integrity: append-only ledger and reconciliation controls
- Measurable reliability: SLOs, alerts, and error budgets
- Backward-compatible rollout: feature flags and staged migrations

## 3) Delivery Structure

Timeline: 16 weeks total (4 waves x 4 weeks)

Workstreams:

- WS1 Platform and API
- WS2 Media Pipeline and Providers
- WS3 Security and Compliance
- WS4 Monetization and Billing
- WS5 Frontend Reliability and UX
- WS6 SRE and Observability

Cadence:

- Weekly staging releases
- Bi-weekly production releases
- Daily async standups, weekly risk review, bi-weekly architecture review

## 4) Wave Plan

### Wave 0 (Week 1): Baseline and Guardrails

Objectives:

- Lock delivery standards and environments
- Establish CI/CD quality gates
- Publish ownership and escalation model

Key tasks:

- Separate dev, staging, and production credentials/projects
- Move secrets to managed secret store and rotate existing keys
- Enforce branch protections and required checks
- Add CI checks: lint, typecheck, tests, dependency scan, secret scan
- Create risk register board from report items
- Publish SLO draft and incident severity policy

Exit criteria:

- No prod secrets in source or local committed env files
- CI blocks failing checks for protected branches
- On-call and incident roles assigned

### Wave 1 (Weeks 2-4): Security and Abuse Prevention

Objectives:

- Close highest-risk auth and abuse gaps
- Ensure strict access control for generation/media resources

Key tasks:

- Central auth middleware for all generation and media endpoints
- Ownership checks on every read/update/delete of tasks/assets
- RBAC policy for admin/operator/service roles
- Rate limiting by user, IP, and endpoint cost class
- Prompt/reference input validation and sanitization
- SSRF hardening and provider domain allowlist
- Audit logging for sensitive mutations

Exit criteria:

- Critical/high auth-abuse findings closed
- Pen test checklist pass for core generation endpoints
- Security dashboard with auth/abuse KPIs live

### Wave 2 (Weeks 5-8): Reliability and Architecture Refactor

Objectives:

- Shift generation execution to queue-worker model
- Stabilize state transitions and retry behavior

Key tasks:

- Introduce queue and worker execution for long-running jobs
- Canonical task state machine: accepted, queued, running, succeeded, failed, canceled
- Idempotency keys on submission and provider actions
- Dead-letter queues and retry with exponential backoff
- Provider adapter interface, timeout budgets, and circuit breakers
- Correlation IDs from API request through worker completion
- Frontend task views driven by server state only

Exit criteria:

- Duplicate submissions do not produce duplicate jobs
- Recoverable provider failures auto-retry per policy
- Full task trace visible in logs and traces

### Wave 3 (Weeks 9-12): Data Integrity, Search, and Lifecycle

Objectives:

- Strengthen storage integrity and retention controls
- Add robust indexing/vectorization pipeline

Key tasks:

- Data model hardening for tasks, assets, prompts, references, credits, payments
- Immutable asset provenance metadata and checksums
- MIME and integrity validation on upload and retrieval
- Retention/deletion automation and right-to-delete workflows
- Async embedding pipeline for prompts/references
- Migration scripts with checkpointed backfill and rollback plans

Exit criteria:

- Data contract versions documented and enforced
- Retention and deletion jobs pass acceptance tests
- Search/vector relevance baseline KPI established

### Wave 4 (Weeks 13-16): Credits, Points, and Payments

Objectives:

- Deliver monetization stack with audit-ready financial controls

Key tasks:

- Append-only credit ledger as source of truth
- Balance projection service derived from ledger events
- Credit reservation at job acceptance and settlement on completion
- Payment gateway integration with webhook signature verification
- Idempotent webhook consumer and replay-safe processing
- Refund, reversal, chargeback, and dispute flows
- Daily reconciliation between internal ledger and gateway settlements
- Wallet and transaction history UI with receipt visibility

Exit criteria:

- Ledger reconciliation variance within defined tolerance
- No balance drift under concurrency tests
- Payment failure and retry UX validated

## 5) Architecture Deliverables

- API gateway policies for auth, rate limits, and request validation
- Orchestration service with state machine and event contracts
- Worker runtime with provider adapters and retry policies
- Event schema registry/versioning for async contracts
- Billing domain services: ledger, metering, pricing, payment events
- Audit and reporting data marts for operations and finance

## 6) Testing and Validation Strategy

Test layers:

- Unit tests for domain logic, policy checks, and accounting math
- Contract tests for provider adapters and internal service interfaces
- Integration tests for queue, workers, and webhook lifecycle
- E2E tests for generation request through asset delivery and billing
- Load tests for queue throughput and hot endpoints
- Chaos tests for provider outage and retry storm resilience

Quality gates for release:

- All required CI checks pass
- No critical vulnerabilities open
- SLO burn rates healthy for prior release window
- Migration verification complete for affected services

## 7) SLOs and KPIs

Platform SLOs:

- API p95 latency for generation submission
- Job completion success rate
- Time-to-first-state-update after submission
- Webhook processing latency and failure rate

Business KPIs:

- Credit burn accuracy versus usage cost
- Payment success rate and retry recovery rate
- Reconciliation accuracy and incident count

Security KPIs:

- Unauthorized access attempt rate
- Blocked abuse events and false-positive rate
- Mean time to detect and mean time to resolve incidents

## 8) Governance and Decision Control

- ADR required for any cross-service contract or billing model change
- Change Advisory review for retention, billing, and auth policies
- Weekly architecture board for risks, deviations, and mitigation
- Strict deprecation policy for versioned APIs/events

## 9) Risks and Mitigations During Execution

- Migration risk: use dual-write only where necessary and verify with canary checks
- Provider instability: enforce timeout budgets, fallback order, and circuit breakers
- Cost overrun: track per-model cost and enforce quotas/rate limits
- Billing defects: gate release on reconciliation dry-run and ledger invariants
- Scope creep: maintain release train and freeze non-critical scope in each wave

## 10) Go-Live Criteria

Go-live requires all of the following:

- Security: no open critical/high vulnerabilities in in-scope systems
- Reliability: SLO targets met for two consecutive weeks in production-like load
- Financial correctness: reconciliation passes with approved tolerance
- Operability: runbooks tested for top incident scenarios
- Compliance readiness: evidence package complete for access, logging, and change controls

## 11) Immediate First 10 Business Days

- Day 1-2: finalize service boundaries, event contracts, and ownership matrix
- Day 3-4: deploy auth middleware and ownership enforcement to staging
- Day 5-6: introduce queue submission path behind feature flag
- Day 7-8: implement idempotency keys and task state machine transitions
- Day 9-10: stand up baseline dashboards, alerts, and incident runbooks

This sequence intentionally closes highest-risk security and state-consistency issues before deeper feature and billing rollout.
