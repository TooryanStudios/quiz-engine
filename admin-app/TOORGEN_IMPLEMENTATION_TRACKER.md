# ToorGen Implementation Tracker (Sprints, Tickets, DoD)

## Usage

- This tracker maps the implementation plan into sprint-ready execution.
- Update status daily in standup.
- Do not move a ticket to Done unless its Definition of Done is fully met.

Status legend:

- Todo
- In Progress
- Blocked
- Done

## Sprint Calendar (16 weeks)

- Sprint 0 (Week 1): Baseline and controls
- Sprint 1 (Weeks 2-3): Auth, ownership, abuse controls
- Sprint 2 (Weeks 4-5): Queue + idempotency + state machine
- Sprint 3 (Weeks 6-7): Provider resilience and frontend state sync
- Sprint 4 (Weeks 8-9): Data integrity and lifecycle controls
- Sprint 5 (Weeks 10-11): Vectorization and migration hardening
- Sprint 6 (Weeks 12-13): Credits ledger and metering
- Sprint 7 (Weeks 14-16): Payments, reconciliation, and go-live hardening

## Ticket Backlog

### Sprint 0

TGN-001 | CI Quality Gates | WS1/WS3 | Status: Todo

- Scope: Add mandatory lint, typecheck, unit tests, dependency scan, secret scan.
- Dependencies: None.
- DoD:
- Protected branches block merge on failing checks.
- Pipeline results visible in PR checks.
- Failure triage runbook published.

TGN-002 | Environment and Secret Isolation | WS1/WS3 | Status: Todo

- Scope: Separate dev/staging/prod configs, move secrets to managed vault, rotate keys.
- Dependencies: TGN-001.
- DoD:
- No production secrets in repository.
- Secret rotation completed and documented.
- Service start-up succeeds in all environments.

TGN-003 | SLO and Incident Baseline | WS6 | Status: Todo

- Scope: Define initial SLOs and incident severity model.
- Dependencies: None.
- DoD:
- SLO doc approved by engineering leads.
- Alert thresholds configured for key APIs and queues.
- Incident channels and on-call schedule active.

### Sprint 1

TGN-010 | Unified Auth Middleware | WS1/WS3 | Status: Todo

- Scope: Centralize auth checks for all ToorGen endpoints.
- Dependencies: TGN-002.
- DoD:
- Every in-scope endpoint passes through common middleware.
- Unauthorized requests return standard error contract.
- Integration tests cover success/failure paths.

TGN-011 | Resource Ownership Enforcement | WS1/WS3 | Status: Todo

- Scope: Enforce owner checks for task and asset operations.
- Dependencies: TGN-010.
- DoD:
- Cross-tenant reads/writes are blocked.
- Ownership checks logged for denied operations.
- Security tests validate isolation.

TGN-012 | Rate Limiting and Quotas | WS1/WS3 | Status: Todo

- Scope: User/IP/endpoint rate limits and quota pre-checks.
- Dependencies: TGN-010.
- DoD:
- Configurable limits by endpoint class.
- Limits observable on dashboard.
- False-positive rate validated in staging.

TGN-013 | Input Validation and SSRF Hardening | WS3 | Status: Todo

- Scope: Validate prompt/reference payloads and remote URL fetch safety.
- Dependencies: TGN-010.
- DoD:
- URL allowlist enforced.
- Unsafe URL patterns blocked and audited.
- Security unit/integration tests passing.

### Sprint 2

TGN-020 | Queue Submission Path | WS1/WS2 | Status: Todo

- Scope: Move long-running generation to async queue.
- Dependencies: TGN-010, TGN-012.
- DoD:
- API accepts and enqueues jobs.
- Queue lag metric visible.
- Backpressure behavior documented.

TGN-021 | Task State Machine | WS1/WS2 | Status: Todo

- Scope: Canonical state model and transition guards.
- Dependencies: TGN-020.
- DoD:
- Invalid transitions rejected.
- Every transition timestamped with actor/source.
- Replay from events reconstructs final state.

TGN-022 | Idempotency Keys | WS1/WS2 | Status: Todo

- Scope: Idempotency at submission and provider call boundaries.
- Dependencies: TGN-020.
- DoD:
- Duplicate client submissions return existing task.
- Duplicate provider callbacks do not duplicate side effects.
- Concurrency tests pass.

TGN-023 | Dead-letter and Retry Policy | WS2 | Status: Todo

- Scope: Retries with exponential backoff and DLQ handling.
- Dependencies: TGN-020.
- DoD:
- Retry max and backoff configured.
- DLQ triage tool/playbook available.
- Error budget impact tracked.

### Sprint 3

TGN-030 | Provider Adapter Interface | WS2 | Status: Todo

- Scope: Standard provider abstraction for Seedance/Atlas/others.
- Dependencies: TGN-021.
- DoD:
- Shared request/response contract implemented.
- Adapter-specific tests pass.
- Provider swap behind feature flags works.

TGN-031 | Timeout and Circuit Breakers | WS2/WS6 | Status: Todo

- Scope: Per-provider timeout budgets and breaker behavior.
- Dependencies: TGN-030.
- DoD:
- Circuit state metrics exported.
- Fallback order documented and tested.
- Recovery behavior verified via fault injection.

TGN-032 | Frontend Server-Authoritative State | WS5 | Status: Todo

- Scope: Remove client-side invented statuses and race-prone polling behavior.
- Dependencies: TGN-021.
- DoD:
- UI state derives from server task state only.
- Optimistic updates constrained to safe actions.
- E2E tests cover refresh/reconnect correctness.

TGN-033 | Correlation IDs End-to-End | WS1/WS6 | Status: Todo

- Scope: Trace request through API, queue, worker, storage.
- Dependencies: TGN-020.
- DoD:
- Correlation ID present in logs and traces.
- Searchable by task id in observability tools.
- On-call runbook includes trace lookup steps.

### Sprint 4

TGN-040 | Asset Integrity Validation | WS2/WS3 | Status: Todo

- Scope: Checksums, MIME checks, and provenance metadata.
- Dependencies: TGN-021.
- DoD:
- Upload and retrieval validations enforced.
- Tampered assets rejected.
- Provenance visible in admin diagnostics.

TGN-041 | Retention and Deletion Automation | WS3 | Status: Todo

- Scope: Lifecycle rules, right-to-delete workflow, audit evidence.
- Dependencies: TGN-011.
- DoD:
- Retention jobs run on schedule.
- Deletion requests complete within policy SLA.
- Compliance report export available.

TGN-042 | Data Contract Versioning | WS1/WS2 | Status: Todo

- Scope: Versioned schemas for APIs and events.
- Dependencies: TGN-030.
- DoD:
- Breaking changes require explicit version bump.
- Contract tests run in CI.
- Deprecation timelines documented.

### Sprint 5

TGN-050 | Embedding Pipeline (Async) | WS2 | Status: Todo

- Scope: Vectorization pipeline for prompts/references.
- Dependencies: TGN-020.
- DoD:
- Embedding jobs processed asynchronously.
- Failure and retry handling in place.
- Baseline relevance metric dashboard available.

TGN-051 | Migration and Backfill Framework | WS1/WS6 | Status: Todo

- Scope: Idempotent backfill scripts and rollback controls.
- Dependencies: TGN-042.
- DoD:
- Dry-run mode and checkpointing implemented.
- Rollback tested in staging.
- Migration report archived per release.

TGN-052 | Load and Chaos Test Suite | WS6 | Status: Todo

- Scope: Throughput, outage, and retry-storm validation.
- Dependencies: TGN-023, TGN-031.
- DoD:
- Load baseline captured and approved.
- Chaos scenarios documented with outcomes.
- Scaling recommendations added to runbook.

### Sprint 6

TGN-060 | Credit Ledger Domain | WS4 | Status: Todo

- Scope: Append-only transactions for purchase, debit, refund, reversal.
- Dependencies: TGN-021.
- DoD:
- Immutable transaction model enforced.
- Ledger invariants validated by automated tests.
- Balance projection service matches ledger replay.

TGN-061 | Usage Metering and Settlement | WS4/WS2 | Status: Todo

- Scope: Reserve on submit, settle on completion, release on failure.
- Dependencies: TGN-060, TGN-022.
- DoD:
- Metering units defined per generation type.
- Settlement correctness tested under retries/cancellations.
- Cost attribution visible per job.

TGN-062 | Wallet and History UI | WS5/WS4 | Status: Todo

- Scope: Credits balance, transaction history, receipts.
- Dependencies: TGN-060.
- DoD:
- Transaction entries link to job/payment source.
- Pagination/filtering implemented.
- UX tested for low-balance and failure states.

### Sprint 7

TGN-070 | Payment Gateway Integration | WS4 | Status: Todo

- Scope: Checkout, webhook ingest, signature validation.
- Dependencies: TGN-060.
- DoD:
- End-to-end purchase flow in staging.
- Webhook signature verification enforced.
- Failure retries and dead-letter handling enabled.

TGN-071 | Idempotent Webhook Processing | WS4/WS1 | Status: Todo

- Scope: Replay-safe event processing for payment provider callbacks.
- Dependencies: TGN-070, TGN-022.
- DoD:
- Duplicate webhooks do not duplicate ledger entries.
- Event processing state auditable.
- Replay test suite passes.

TGN-072 | Reconciliation and Finance Reports | WS4/WS6 | Status: Todo

- Scope: Daily reconciliation against provider settlement files/events.
- Dependencies: TGN-071.
- DoD:
- Automated daily reconciliation job runs.
- Variance alerts configured.
- Exception queue and resolution workflow documented.

TGN-073 | Go-Live Hardening and Runbooks | WS6/WS3 | Status: Todo

- Scope: Final SLO verification, incident drills, and release readiness.
- Dependencies: All prior sprint critical tickets.
- DoD:
- Two-week SLO stability achieved.
- Top incident runbooks tested in drills.
- Go-live review signed by engineering, security, and product.

## Program-Level Definition of Done

The program is complete only when all conditions below are true:

- All P0 and P1 risks from risk report are closed or accepted with documented mitigation.
- Security scan and pen test findings are resolved to agreed policy thresholds.
- Queue-driven workflow is default path and legacy direct path is removed or disabled.
- Credit ledger reconciles with payment gateway within approved tolerance.
- Observability and on-call runbooks are live and validated in incident exercises.
- Stakeholders approve launch readiness with documented sign-off.

## Weekly Reporting Template

- Planned this week
- Completed this week
- Current blockers
- Risk changes
- SLO/quality gate status
- Financial correctness status (if billing changes included)
- Decisions needed from architecture board
