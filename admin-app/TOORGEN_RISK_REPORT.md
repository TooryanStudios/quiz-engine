# ToorGen Risk Assessment Report
**Version:** 1.0  
**Date:** May 15, 2026  
**Audience:** Software Engineering / Architecture  
**Classification:** Internal - Engineering Review  

---

## Executive Summary

ToorGen is a web-based AI video generation platform with strong feature coverage but significant risk exposure in:

1. **Over-broad public media accessibility** – References and outputs are intentionally public, creating privacy/IP leakage risk.
2. **Backend proxy misuse vectors** – URL proxying patterns vulnerable to SSRF and cost abuse.
3. **Generation endpoint abuse** – Unbounded generation submissions and status polling can cause credit exhaustion.
4. **Authorization inconsistency** – Mixed Firestore/Storage policies create audit gaps.
5. **Client persistence drift** – localStorage queue/history can diverge from server state.
6. **Task observability gaps** – Polling-only status tracking misses state transitions under network instability.
7. **Prompt/reference injection** – Unvalidated prompt composition into model requests.
8. **Asset integrity gaps** – Relaxed upload validation allows unsupported/malicious files.
9. **Data lifecycle ambiguity** – No clear retention/deletion policy for artifacts.
10. **Provider fallback opacity** – Requested vs. effective model mapping unclear for reproducibility.
11. **Duplicate submission risk** – Retry paths lack idempotency keys.
12. **Client scalability bottlenecks** – Growing history/library operations degrade UI responsiveness.

**Top Priority Actions:**
- Harden API trust boundaries and proxy controls.
- Implement quota/rate limiting on generation endpoints.
- Segregate public/private media storage patterns.
- Add centralized audit logging and correlation tracking.
- Introduce server-side task state as source of truth.

---

## Risk Register (Detailed)

### R1: Over-broad Public Media Accessibility
**Likelihood:** High | **Impact:** High | **Priority:** 🔴 Critical

**Description:**  
Reference images, generated videos, and audio are stored with public-read permissions to enable upstream model provider fetches. This creates inadvertent data exposure if URLs persist beyond intended use scope or are indexed by search engines.

**Evidence:**
- Storage rules allow public read for `/toorgen-extend/`, `/toorgen-lab/`, `/seedance-references/` paths.
- Generated asset URLs are passed directly to users with no expiry controls.
- No differentiation between transient vs. permanent/archived assets.

**Consequences:**
- Privacy leakage: users may unknowingly share personal/confidential video contexts.
- IP/compliance risk: generated content may contain copyrighted or sensitive material.
- Cost exposure: cached/indexed URLs can drive unexpected storage retrieval and bandwidth cost.

**Root Causes:**
- Functional requirement to allow model providers direct asset fetch.
- No signed URL or expiry strategy implemented.
- Single "public" storage tier for all transient and archive content.

---

### R2: Backend Proxy Misuse and SSRF Risk
**Likelihood:** Medium | **Impact:** High | **Priority:** 🔴 Critical

**Description:**  
The `/api/video-proxy` endpoint fetches user-supplied video URLs and re-serves them to the browser. This pattern is vulnerable to SSRF (Server-Side Request Forgery), allowing internal network probing, metadata endpoint access, and uncontrolled egress.

**Evidence:**
- `downloadVideoBlob()` in `generationPersistence.ts` uses fetch on arbitrary URLs.
- No visible domain allowlist or IP range restrictions.
- Proxy used to bypass CORS; any user URL can be proxied.

**Consequences:**
- SSRF attacks: probe internal services, cloud metadata (AWS IMDSv2, GCP metadata).
- Cache poisoning: inject malicious content into storage via proxy.
- Egress cost explosion: attackers can force massive downloads.
- Availability risk: slow/stalled uploads can exhaust backend connections.

**Root Causes:**
- Proxy added for CORS workaround without security boundary.
- No URL validation or provider domain restrictions.
- Missing timeout, content-length, and MIME-type guards.

---

### R3: Generation Endpoint Abuse and Cost Burn
**Likelihood:** High | **Impact:** High | **Priority:** 🔴 Critical

**Description:**  
Generation requests and status polling lack rate limiting, quotas, or abuse detection. A single compromised user account or automation script can rapidly exhaust credits and degrade service for all users.

**Evidence:**
- `handleGenerate()` and `fetchStatusForQueueItem()` have no per-user/per-project rate limits.
- Status polling runs every 5 seconds on active tasks with no backoff or circuit breaker.
- Batch/split workflows in Flow Canvas can create 10s-100s of generation requests.
- No idempotency key; retry logic can submit duplicate generations.

**Consequences:**
- Credit exhaustion (potential financial impact).
- Denial of Wallet (attacker bankrupts account).
- Service degradation for legitimate users.
- Provider rate-limiting can cascade failures across system.

**Root Causes:**
- Unbounded generation submission and polling.
- No server-side quota per user/project/day.
- No idempotency or duplicate detection.

---

### R4: Authorization Consistency Drift
**Likelihood:** Medium | **Impact:** High | **Priority:** 🔴 High

**Description:**  
Firestore rules and Storage rules have inconsistent permission models. Some paths are public, some private, and some inherit ambiguous defaults, creating audit and compliance gaps.

**Evidence:**
- `/reference_library/` requires ownership, but `/toorgen-extend/` is public-write.
- Storage paths have different size limits (50MB, 80MB, 20MB).
- No central policy matrix or version control for auth rules.

**Consequences:**
- Unintended read/write in edge paths.
- Compliance violations (GDPR, SOC2 audit findings).
- Hard to trace which paths are "intentionally public" vs. misconfigured.

**Root Causes:**
- Auth rules evolved incrementally without central governance.
- Different subsystems (ToorGen, WorkHub, Lab) have separate storage buckets with divergent policies.

---

### R5: Client-Side Persistence Drift (Local State vs. Server State)
**Likelihood:** High | **Impact:** Medium | **Priority:** 🔴 High

**Description:**  
Queue, history, settings, and reference libraries are stored in localStorage and managed on the client. Long-lived sessions can drift from server state, causing stale status displays and duplicate retry logic.

**Evidence:**
- Queue persisted to localStorage but server is source of truth for task lifecycle.
- Status polling updates client queue but no reconciliation on app reopen.
- Resume flow relies on manual taskId entry; no auto-recovery on disconnect.

**Consequences:**
- "Ghost tasks" displayed after server cleanup.
- Duplicate retries if user manually resubmits thinking task failed.
- User confusion and lost work if UX shows stale status.
- No reliable way to answer "what's actually running on the backend?"

**Root Causes:**
- localStorage chosen for simplicity without sync strategy.
- No monotonic versioning or server-side state snapshot for reconciliation.

---

### R6: Long-Running Task Observability Gaps
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🔴 High

**Description:**  
Status tracking relies exclusively on polling with 5-second intervals. Browser tab throttling, network instability, or polling backoff can cause missed state transitions and false failure states.

**Evidence:**
- `startPollingForQueueItem()` uses `setInterval()` every 5 seconds.
- No exponential backoff or adaptive polling.
- No push channel (WebSocket/SSE) for real-time updates.
- Polling restarts on tab visibility but may miss status change if tab was hidden.

**Consequences:**
- Completion states missed, users think tasks failed.
- Long waits before stale tasks are cleaned up.
- Excessive status API calls during network instability.

**Root Causes:**
- Polling chosen for simplicity without real-time infrastructure.

---

### R7: Prompt/Reference Injection Risk
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🔴 High

**Description:**  
Prompts are composed from multiple sources (user text, mentions, character cards, style templates) and sent directly to the model API without validation or sanitization. Injection of unsafe directives or jailbreak patterns can produce non-compliant or unsafe outputs.

**Evidence:**
- `buildSeedancePrompt()` concatenates strings without structural validation.
- Character mention markup `@{name}` expanded without context checks.
- User-supplied story bible and style prefix merged into final prompt.

**Consequences:**
- Policy violations (unsafe outputs that breach model terms of service).
- Unexpected model behavior (reasoning loops, refusals).
- Audit trail gaps if injected directives are not logged.

**Root Causes:**
- Prompt building is ad-hoc string concatenation.
- No server-side validation or policy enforcement.

---

### R8: Asset Integrity and Content-Type Spoofing
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🟡 Medium

**Description:**  
Image/video/audio uploads lack robust validation. Files can be uploaded with mismatched extensions/MIME types, or unsupported formats can reach processing queues.

**Evidence:**
- Upload functions in `useToorGenAssetsLibrary.ts` only check file type at browser level.
- Storage rules check content-type but not magic bytes.
- No max-dimensions or max-duration enforcement.

**Consequences:**
- Processing failures and error logs.
- Storage bloat from unsupported or corrupted files.
- Potential security vector if files not scanned for malware.

**Root Causes:**
- Validation delegated to browser and storage rules; no server-side guard.

---

### R9: Data Lifecycle and Retention Ambiguity
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🟡 Medium

**Description:**  
Generated videos, reference libraries, and user settings accumulate indefinitely. No clear TTL, archival, or deletion policy exists. Complicates compliance (GDPR right-to-delete) and inflates storage costs.

**Evidence:**
- History records loaded from Firestore with max 500 limit, but no TTL.
- Reference library merged from multiple sources; no explicit cleanup.
- No user data export or deletion workflow.

**Consequences:**
- Rising storage costs over time.
- GDPR right-to-delete violations if data cannot be purged.
- Difficulty recovering from accidental data exposure.

**Root Causes:**
- Retention policy not defined at architecture stage.
- No lifecycle cleanup jobs scheduled.

---

### R10: Provider Fallback Ambiguity
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🟡 Medium

**Description:**  
Requested vs. effective model/provider mapping is unclear in logs and history. When fallback occurs (e.g., requested Seedance API but got Atlas Cloud), reproducibility and incident diagnosis become difficult.

**Evidence:**
- `pickRequestedModel()`, `pickEffectiveModel()`, `pickFallbackReason()` utility functions extract from response.
- History stores both, but UI doesn't always surface fallback reason.
- No "deterministic model" mode for regression testing.

**Consequences:**
- Reproducibility issues when retrying old generations.
- Audit and compliance gaps for regulated workflows.
- Difficult incident diagnosis when provider behavior differs.

**Root Causes:**
- Fallback logic added to handle provider outages; not fully instrumented.

---

### R11: Idempotency and Duplicate Generation Submissions
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🟡 Medium

**Description:**  
Generation requests lack idempotency keys. Retry logic and manual re-submissions can create duplicate tasks, incurring duplicate charges and cluttering history.

**Evidence:**
- `handleGenerate()` creates new QueueItem without dedup check.
- Resume flow accepts manual taskId; no dedupe on resubmit.
- No idempotency header sent to backend.

**Consequences:**
- Duplicate charges for accidental re-submissions.
- Cluttered history with near-identical outputs.
- Confusion resolving which output is the "real" one.

**Root Causes:**
- Idempotency not enforced at API contract stage.

---

### R12: Client-Side Scalability Bottlenecks
**Likelihood:** Medium | **Impact:** Medium | **Priority:** 🟡 Medium

**Description:**  
History and library filtering/merging operations run in the browser on large datasets. Memory pressure and UI lag increase with session duration.

**Evidence:**
- `mergeMediaLibraryItems()`, `filterMediaLibraryItems()` run on potentially 500+ history records.
- Memoization helps but not sufficient for very large libraries.
- No server-side search/filter; all pagination and sorting client-side.

**Consequences:**
- UI lag in long-lived sessions (especially on lower-end devices).
- Memory pressure leading to browser crashes.
- Slow search/filter on large libraries.

**Root Causes:**
- Client chosen as computation layer for simplicity without load testing.

---

## Cross-Cutting Security and Reliability Gaps

### A. Audit Logging and Observability
**Gap:** No centralized audit trail for generation requests, media uploads, status checks, or data access.  
**Impact:** Impossible to trace who accessed what, when, or for audit/compliance.  
**Fix:** Add structured logging with correlation ID, user/project/task context to all sensitive operations.

### B. Rate Limiting and Quota Enforcement
**Gap:** No per-user, per-project, or global rate limits.  
**Impact:** Noisy neighbor, cost abuse, service degradation.  
**Fix:** Implement token bucket rate limiter + server-side quota per user/project/day.

### C. Secrets and Credentials Management
**Gap:** Provider API keys and sensitive configs must be backend-only.  
**Impact:** If keys appear in frontend logs/network, compromise is instant.  
**Fix:** Enforce secrets manager (HashiCorp Vault, AWS Secrets Manager) and regular key rotation.

### D. Incident Response and Rollback
**Gap:** No clear runbooks for provider outage, cost spike, or storage misconfiguration.  
**Impact:** MTTR increases, business impact extends.  
**Fix:** Document incident playbooks and add automated alerting/circuit breakers.

---

## Recommended 30/60/90-Day Remediation Plan

### Phase 1: Critical Hardening (Days 1–30)
1. **URL Allowlist & SSRF Protection** (R2)
   - Implement domain allowlist for proxy and reference fetches.
   - Block private IPs, localhost, metadata endpoints.
   - Add content-length timeout and MIME validation.

2. **Rate Limiting & Quota** (R3)
   - Deploy token bucket rate limiter on `/api/seedance/generate` and `/api/seedance/status`.
   - Add per-user, per-project, and global quotas.
   - Enforce idempotency key for generation requests.

3. **Centralized Audit Logging** (A)
   - Add structured logging with correlation IDs.
   - Log all generation submissions, status checks, uploads, and playbacks.

4. **Authorization Audit** (R4)
   - Document current Firestore/Storage policy matrix.
   - Add CI tests for expected read/write outcomes per role/path.

### Phase 2: Policy and Lifecycle (Days 31–60)
1. **Signed URL Strategy** (R1)
   - Implement short-lived signed URLs for provider fetches.
   - Separate transient media bucket from archive/private bucket.

2. **Data Lifecycle Management** (R9)
   - Define retention tiers: transient (7d), reference (30d), archive (1y+).
   - Implement TTL cleanup jobs and user delete workflows.

3. **Client/Server Reconciliation** (R5)
   - Add monotonic version to task state.
   - Implement reconciliation job on app start.
   - Add stale-state detection and recovery UX.

4. **Provider Fallback Instrumentation** (R10)
   - Expose fallback reason in all task payloads and logs.
   - Add "no fallback" mode for regression/QA runs.

### Phase 3: Resilience and Scale (Days 61–90)
1. **Push-Based Task Updates** (R6)
   - Implement WebSocket or SSE for real-time task status.
   - Keep polling as fallback, but reduce polling frequency.

2. **Prompt Injection Hardening** (R7)
   - Implement server-side prompt normalization and policy checks.
   - Add prompt validation test suite.

3. **Asset Integrity Validation** (R8)
   - Server-side MIME + magic byte validation.
   - Enforce max dimensions/duration per media kind.
   - Add malware/content scanning queue.

4. **Scalability Optimization** (R12)
   - Move library search/filter to server-backed pagination.
   - Virtualize history/reference UI components.
   - Add indexing for high-cardinality fields (createdAt, kind, URL).

---

## Security Control Checklist

- [ ] URL allowlist for proxy and reference fetches (R2).
- [ ] SSRF protections: block private IPs, metadata endpoints.
- [ ] Rate limiting and quota enforcement on generation/status endpoints (R3).
- [ ] Idempotency key generation and backend dedup (R11).
- [ ] Centralized audit logging with correlation IDs (A).
- [ ] Centralized secrets management (C).
- [ ] Policy-as-code tests for Firestore/Storage rules (R4).
- [ ] Signed URL generation for media access (R1).
- [ ] Server-side prompt validation and normalization (R7).
- [ ] Content-type + magic byte validation on upload (R8).
- [ ] Data retention and TTL cleanup jobs (R9).
- [ ] Provider fallback instrumentation and telemetry (R10).
- [ ] Circuit breaker for provider outages.
- [ ] Incident runbooks and alerting.

---

## Appendix: Implementation Priorities Matrix

| Risk ID | Fix Complexity | Business Value | Engineering Effort | Recommended Order |
|---------|---|---|---|---|
| R2 | Low | High | 3 days | 1st (days 1–3) |
| R3 | Medium | High | 5 days | 2nd (days 4–8) |
| R4 | Low | Medium | 2 days | 3rd (days 9–10) |
| R1 | Medium | Medium | 5 days | 4th (days 11–15) |
| A | Low | High | 3 days | 5th (days 16–18) |
| R5 | Medium | Medium | 4 days | Phase 2 (day 31) |
| R10 | Low | Medium | 2 days | Phase 2 (day 35) |
| R9 | Medium | Low | 3 days | Phase 2 (day 40) |
| R6 | High | Medium | 7 days | Phase 3 (day 61) |
| R7 | Medium | Medium | 4 days | Phase 3 (day 70) |
| R8 | Medium | Low | 3 days | Phase 3 (day 75) |
| R12 | High | Low | 6 days | Phase 3 (day 82) |

---

**End of Risk Report**
