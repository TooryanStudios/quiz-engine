# ToorGen Greenfield Bootstrap (Fresh Start, No Legacy Debt)

## Core Principle

**Build in layers with explicit contracts at each boundary.** Every layer:
- Has clear input/output contracts
- Is independently testable
- Passes integration before next layer depends on it
- Never reaches backward into previous layers

## Phase 0: Foundation (Days 1-3)

### Layer 0.1: Project Scaffolding and DevOps

**Do this first:** Set up empty repos, CI/CD, and secrets management.

```
toorgen-fresh/
├── backend/                    # Node.js API orchestration
│   ├── src/
│   │   ├── config/             # Env, secrets, constants
│   │   ├── middleware/         # Auth, logging, error handling (FIRST!)
│   │   ├── domain/             # Core business logic (SECOND!)
│   │   ├── adapters/           # External provider integrations
│   │   ├── routes/             # HTTP endpoints
│   │   └── workers/            # Queue job handlers
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
├── frontend/                   # React TypeScript
│   ├── src/
│   │   ├── config/
│   │   ├── api/                # Typed API client
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   ├── tests/
│   └── package.json
├── packages/                   # Shared contracts
│   ├── types/                  # DTO, event schemas, error types
│   ├── constants/              # Shared business rules
│   └── test-fixtures/          # Mock data for both frontend and backend
├── infra/                      # Kubernetes, terraform
│   ├── k8s/
│   ├── secrets/
│   └── monitoring/
├── docs/
│   ├── API_SPEC.md            # OpenAPI or AsyncAPI contracts
│   ├── DATA_MODEL.md          # Entity schemas and relations
│   ├── EVENT_SCHEMA.md        # Queue/event shapes
│   └── DEPLOYMENT.md
└── .github/workflows/          # CI/CD pipeline (lint, test, build, scan)
```

**Deliverables for Layer 0.1:**

- [ ] GitHub repos (backend, frontend, packages, infra) created with branch protection
- [ ] Secrets vault (AWS Secrets Manager or HashiCorp Vault) initialized
- [ ] GitHub Actions CI pipeline with required checks: lint, type, test, scan, secret-scan
- [ ] All environment configs (dev, staging, prod) declared in `.env.example` (no actual secrets)
- [ ] Dockerfile and docker-compose for local dev

**Integration test:** `npm install` + `docker-compose up` starts all services without errors.

---

### Layer 0.2: Core Domain Types and Contracts

**Do this second:** Define the immutable contracts that all layers will depend on.

**Files to create:**

1. `packages/types/src/generation.ts`

```typescript
// Task lifecycle states
export type TaskState = 
  | "accepted"       // API accepted submission
  | "queued"         // Enqueued, awaiting worker
  | "running"        // Worker processing
  | "succeeded"      // Completed successfully
  | "failed"         // Irrecoverable error
  | "canceled";      // User canceled

export interface Task {
  id: string;                    // UUID, immutable
  ownerId: string;               // Ownership boundary
  state: TaskState;
  stateHistory: StateTransition[]; // Immutable log
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  input: GenerationInput;
  output?: GenerationOutput;
  error?: TaskError;
  correlationId: string;         // Trace anchor
  idempotencyKey: string;        // Duplicate prevention
}

export interface StateTransition {
  from: TaskState;
  to: TaskState;
  timestamp: Date;
  actor: string;                 // "api" | "worker" | "system"
  reason?: string;
}

export interface GenerationInput {
  provider: "seedance" | "atlas" | "byteplax" | "grok";
  prompt: string;
  references?: Reference[];
  config: ProviderConfig;
}

export interface Reference {
  type: "image" | "text" | "video";
  url: string;
  checksum: string;              // Integrity anchor
  mimeType: string;
}

export interface GenerationOutput {
  assetId: string;
  url: string;
  checksum: string;
  mimeType: string;
  metadata: {
    provider: string;
    processingTimeMs: number;
    model: string;
  };
}

export interface TaskError {
  code: string;
  message: string;
  retryable: boolean;
  timestamp: Date;
}
```

2. `packages/types/src/billing.ts`

```typescript
export interface CreditTransaction {
  id: string;
  ledgerId: string;              // Immutable ledger anchor
  ownerId: string;
  type: "purchase" | "debit" | "refund" | "reversal" | "bonus";
  amountCents: number;           // Always integers (cents)
  reason: string;
  relatedTaskId?: string;        // Link to generation task
  relatedPaymentId?: string;     // Link to payment event
  timestamp: Date;
  idempotencyKey: string;
}

export interface Balance {
  ownerId: string;
  totalCents: number;            // Derived from ledger
  reservedCents: number;         // For pending tasks
  availableCents: number;        // totalCents - reservedCents
  lastUpdated: Date;
}

export interface PaymentEvent {
  id: string;
  ownerId: string;
  provider: "stripe" | "paypal"; // Extensible
  externalId: string;            // Provider transaction ID
  amountCents: number;
  status: "pending" | "succeeded" | "failed";
  createdAt: Date;
  settledAt?: Date;
  idempotencyKey: string;
}
```

3. `packages/types/src/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_INPUT: "INVALID_INPUT",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
```

**Deliverables for Layer 0.2:**

- [ ] Type package exports all contracts
- [ ] All types are immutable where semantically required
- [ ] Error types are comprehensive and extensible
- [ ] No circular dependencies between type modules

**Integration test:** `import * from "@toorgen/types"` works in backend and frontend without conflicts.

---

## Phase 1: Backend Foundation (Days 4-7)

### Layer 1.1: Middleware and Request Lifecycle

**Do this first in backend:** Auth, logging, error handling that wraps everything.

**File:** `backend/src/middleware/index.ts`

1. **Authentication middleware** (verifies JWT/API key)
2. **Ownership enforcement** (injects `req.ownerId`)
3. **Correlation ID** (generates or propagates trace anchor)
4. **Request logging** (structured logs with correlation ID)
5. **Error handler** (converts domain errors to HTTP responses)

**Contract:**
- Every request has `req.ownerId` and `req.correlationId` by the time it reaches handlers
- Unauthorized/unauthenticated requests never reach handlers
- All errors serialize to standard JSON response shape

**Deliverables:**

- [ ] Auth middleware integrates with JWT provider (Firebase Auth for MVP)
- [ ] Ownership middleware blocks cross-tenant reads/writes
- [ ] Correlation ID flows through all logs
- [ ] Error handler is the only place that returns HTTP errors

**Integration test:** 
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks
# 401 if no token
# 200 if valid token with data scoped to ownerId
```

---

### Layer 1.2: Domain Services (Business Logic, No I/O)

**Do this second:** Core generation and billing logic that is 100% testable without mocks.

**Files:**

1. `backend/src/domain/generation-service.ts`

```typescript
export class GenerationService {
  async submitTask(
    ownerId: string,
    input: GenerationInput,
    idempotencyKey: string,
    correlationId: string
  ): Promise<Task> {
    // No I/O in this method. Returns a Task domain object.
    // Caller handles persistence and queue enqueue.
    
    if (!input.prompt || input.prompt.trim().length === 0) {
      throw new AppError("INVALID_INPUT", "Prompt cannot be empty");
    }
    
    const task: Task = {
      id: uuid(),
      ownerId,
      state: "accepted",
      stateHistory: [{
        from: "accepted",
        to: "accepted",
        timestamp: new Date(),
        actor: "api",
      }],
      submittedAt: new Date(),
      input,
      correlationId,
      idempotencyKey,
    };
    
    return task;
  }

  canTransition(task: Task, toState: TaskState): boolean {
    const validTransitions: Record<TaskState, TaskState[]> = {
      "accepted": ["queued", "canceled"],
      "queued": ["running", "failed", "canceled"],
      "running": ["succeeded", "failed"],
      "succeeded": [],
      "failed": ["queued"],  // Retry
      "canceled": [],
    };
    return validTransitions[task.state].includes(toState);
  }

  transitionState(
    task: Task,
    toState: TaskState,
    actor: string,
    reason?: string
  ): Task {
    if (!this.canTransition(task, toState)) {
      throw new AppError(
        "INVALID_STATE_TRANSITION",
        `Cannot transition from ${task.state} to ${toState}`
      );
    }
    
    const updatedTask = {
      ...task,
      state: toState,
      stateHistory: [
        ...task.stateHistory,
        {
          from: task.state,
          to: toState,
          timestamp: new Date(),
          actor,
          reason,
        },
      ],
    };
    
    if (toState === "running") {
      updatedTask.startedAt = new Date();
    } else if (toState === "succeeded" || toState === "failed") {
      updatedTask.completedAt = new Date();
    }
    
    return updatedTask;
  }
}
```

2. `backend/src/domain/billing-service.ts`

```typescript
export class BillingService {
  reserveCredits(
    ownerId: string,
    amountCents: number,
    taskId: string,
    currentBalance: Balance
  ): { reserved: number; available: number } {
    if (currentBalance.availableCents < amountCents) {
      throw new AppError(
        "INSUFFICIENT_CREDITS",
        `Need ${amountCents} cents, have ${currentBalance.availableCents}`,
        402
      );
    }
    
    return {
      reserved: amountCents,
      available: currentBalance.availableCents - amountCents,
    };
  }

  recordLedgerEntry(
    ownerId: string,
    type: CreditTransaction["type"],
    amountCents: number,
    reason: string,
    idempotencyKey: string,
    relatedTaskId?: string
  ): CreditTransaction {
    // Pure function: returns transaction object, no I/O
    return {
      id: uuid(),
      ledgerId: uuid(),  // Anchors immutable log
      ownerId,
      type,
      amountCents,
      reason,
      relatedTaskId,
      timestamp: new Date(),
      idempotencyKey,
    };
  }

  settleAndRelease(
    transaction: CreditTransaction,
    succeeded: boolean,
    actualCostCents?: number
  ): CreditTransaction[] {
    // Generates follow-on transactions for settlement
    const txns: CreditTransaction[] = [transaction];
    
    if (!succeeded && transaction.type === "debit") {
      // Failure refund
      txns.push({
        ...transaction,
        id: uuid(),
        type: "refund",
        amountCents: transaction.amountCents,
        reason: "Task failed, credits refunded",
        timestamp: new Date(),
      });
    } else if (actualCostCents && actualCostCents < transaction.amountCents) {
      // Partial refund
      txns.push({
        ...transaction,
        id: uuid(),
        type: "refund",
        amountCents: transaction.amountCents - actualCostCents,
        reason: "Cost less than reserved, refunding difference",
        timestamp: new Date(),
      });
    }
    
    return txns;
  }
}
```

**Deliverables:**

- [ ] GenerationService has no external dependencies, all I/O-free
- [ ] State machine logic is exhaustively tested (no mocks needed)
- [ ] BillingService ensures balance never goes negative (invariant enforced)
- [ ] All business rules live in domain layer, not scattered in handlers

**Integration test:**
```bash
npm test -- --testPathPattern="domain-service"
# 100% pass rate, no I/O, all tests run in <1s total
```

---

### Layer 1.3: Repositories and Persistence (Data Access Only)

**Do this third:** Abstraction for Task and Credit storage, with idempotency guards.

**Files:**

1. `backend/src/repositories/task-repository.ts`

```typescript
export interface ITaskRepository {
  createTask(task: Task): Promise<Task>;
  getTaskById(taskId: string, ownerId: string): Promise<Task | null>;
  getTaskByIdempotencyKey(key: string, ownerId: string): Promise<Task | null>;
  updateTask(task: Task, ownerId: string): Promise<Task>;
  listTasksByOwnerId(ownerId: string, limit: number, offset: number): Promise<Task[]>;
}

export class TaskRepository implements ITaskRepository {
  constructor(private db: Database) {}

  async createTask(task: Task): Promise<Task> {
    // Idempotency check first
    const existing = await this.db.query(
      "SELECT * FROM tasks WHERE idempotency_key = ? AND owner_id = ?",
      [task.idempotencyKey, task.ownerId]
    );
    
    if (existing.length > 0) {
      return existing[0]; // Already created, return it
    }
    
    await this.db.query(
      `INSERT INTO tasks (id, owner_id, state, input, correlation_id, idempotency_key, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.ownerId, task.state, JSON.stringify(task.input), 
       task.correlationId, task.idempotencyKey, task.submittedAt]
    );
    
    return task;
  }

  async updateTask(task: Task, ownerId: string): Promise<Task> {
    // Ownership check
    const existing = await this.getTaskById(task.id, ownerId);
    if (!existing) {
      throw new AppError("RESOURCE_NOT_FOUND", "Task not found");
    }
    
    // Record state history
    const newTransitions = task.stateHistory.slice(existing.stateHistory.length);
    for (const transition of newTransitions) {
      await this.db.query(
        `INSERT INTO task_state_history (task_id, from_state, to_state, actor, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [task.id, transition.from, transition.to, transition.actor, transition.reason, transition.timestamp]
      );
    }
    
    await this.db.query(
      "UPDATE tasks SET state = ?, output = ?, error = ?, completed_at = ? WHERE id = ? AND owner_id = ?",
      [task.state, JSON.stringify(task.output), JSON.stringify(task.error), task.completedAt, task.id, ownerId]
    );
    
    return task;
  }

  // ... other methods follow same pattern: ownership check first
}
```

2. `backend/src/repositories/credit-ledger-repository.ts`

```typescript
export interface ICreditLedgerRepository {
  recordTransaction(txn: CreditTransaction): Promise<CreditTransaction>;
  getTransactionsByIdempotencyKey(key: string, ownerId: string): Promise<CreditTransaction[]>;
  getBalanceForOwner(ownerId: string): Promise<Balance>;
  getTransactionsByOwnerId(ownerId: string, limit: number, offset: number): Promise<CreditTransaction[]>;
}

export class CreditLedgerRepository implements ICreditLedgerRepository {
  constructor(private db: Database) {}

  async recordTransaction(txn: CreditTransaction): Promise<CreditTransaction> {
    // Idempotency: replay protection
    const existing = await this.db.query(
      "SELECT * FROM credit_ledger WHERE idempotency_key = ? AND owner_id = ?",
      [txn.idempotencyKey, txn.ownerId]
    );
    
    if (existing.length > 0) {
      return existing[0]; // Already recorded
    }
    
    await this.db.query(
      `INSERT INTO credit_ledger (id, ledger_id, owner_id, type, amount_cents, reason, related_task_id, related_payment_id, timestamp, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txn.id, txn.ledgerId, txn.ownerId, txn.type, txn.amountCents, txn.reason, 
       txn.relatedTaskId, txn.relatedPaymentId, txn.timestamp, txn.idempotencyKey]
    );
    
    return txn;
  }

  async getBalanceForOwner(ownerId: string): Promise<Balance> {
    // Derived from immutable ledger
    const result = await this.db.query(
      `SELECT 
        SUM(CASE WHEN type IN ('purchase', 'bonus', 'refund') THEN amount_cents ELSE -amount_cents END) as total,
        SUM(CASE WHEN type = 'debit' THEN amount_cents ELSE 0 END) as reserved
       FROM credit_ledger WHERE owner_id = ?`,
      [ownerId]
    );
    
    const total = result[0]?.total || 0;
    const reserved = result[0]?.reserved || 0;
    
    return {
      ownerId,
      totalCents: total,
      reservedCents: reserved,
      availableCents: total - reserved,
      lastUpdated: new Date(),
    };
  }
}
```

**Deliverables:**

- [ ] All repositories implement idempotency (duplicate submissions are no-ops)
- [ ] Ownership checks are enforced at repository level
- [ ] All writes are append-only (no deletes except via retention policy)
- [ ] Balance is always derived from immutable ledger, never cached unsafely

**Integration test:**
```bash
INSERT task twice with same idempotency key → only one row created
INSERT ledger transaction twice → only one row created
```

---

### Layer 1.4: Queue and Worker Setup

**Do this fourth:** Job enqueue and worker execution, with guaranteed retry.

**Files:**

1. `backend/src/queue/queue-client.ts`

```typescript
export interface IQueueClient {
  enqueue(job: GenerationJob, delayMs?: number): Promise<string>; // Returns job ID
  acknowledge(jobId: string): Promise<void>;
  nack(jobId: string, retryable: boolean, reason: string): Promise<void>;
}

export class RabbitMQQueueClient implements IQueueClient {
  async enqueue(job: GenerationJob, delayMs = 0): Promise<string> {
    const jobId = uuid();
    const message = {
      id: jobId,
      correlationId: job.correlationId,
      idempotencyKey: job.idempotencyKey,
      ownerId: job.ownerId,
      taskId: job.taskId,
      input: job.input,
      timestamp: new Date(),
    };
    
    await this.channel.assertQueue("generation-jobs", { durable: true });
    this.channel.sendToQueue(
      "generation-jobs",
      Buffer.from(JSON.stringify(message)),
      { persistent: true, expiration: "24h" } // TTL 24h
    );
    
    return jobId;
  }

  async nack(jobId: string, retryable: boolean, reason: string): Promise<void> {
    // If retryable, requeue with exponential backoff
    // If not, send to dead-letter queue
  }
}
```

2. `backend/src/workers/generation-worker.ts`

```typescript
export class GenerationWorker {
  constructor(
    private queue: IQueueClient,
    private generationService: GenerationService,
    private taskRepo: ITaskRepository,
    private billingService: BillingService,
    private creditRepo: ICreditLedgerRepository,
    private providerAdapter: IProviderAdapter
  ) {}

  async processJob(message: GenerationJob): Promise<void> {
    const correlationId = message.correlationId;
    const logger = createLogger(correlationId);
    
    try {
      logger.info("Job started", { taskId: message.taskId });
      
      // 1. Fetch task from DB
      const task = await this.taskRepo.getTaskById(message.taskId, message.ownerId);
      if (!task) {
        throw new AppError("RESOURCE_NOT_FOUND", "Task not found");
      }
      
      // 2. Transition to running
      const runningTask = this.generationService.transitionState(
        task,
        "running",
        "worker",
        "Started execution"
      );
      await this.taskRepo.updateTask(runningTask, message.ownerId);
      
      // 3. Call provider
      const result = await this.providerAdapter.generate(
        message.input,
        { timeout: 300000, correlationId } // 5-minute timeout
      );
      
      // 4. Transition to succeeded
      const succeededTask = this.generationService.transitionState(
        runningTask,
        "succeeded",
        "worker",
        "Generation completed"
      );
      succeededTask.output = result;
      
      // 5. Settle credits (if any refund needed)
      const costCents = result.metadata?.costCents || result.metadata?.estimatedCost;
      const settlement = this.billingService.settleAndRelease(
        { /* initial debit txn */ },
        true,
        costCents
      );
      for (const txn of settlement) {
        await this.creditRepo.recordTransaction(txn);
      }
      
      await this.taskRepo.updateTask(succeededTask, message.ownerId);
      logger.info("Job succeeded", { taskId: message.taskId });
      
      // Acknowledge to queue
      await this.queue.acknowledge(message.id);
    } catch (err) {
      logger.error("Job failed", { taskId: message.taskId, error: err });
      
      // Transition to failed
      const task = await this.taskRepo.getTaskById(message.taskId, message.ownerId);
      const failedTask = this.generationService.transitionState(
        task,
        "failed",
        "worker",
        err.message
      );
      failedTask.error = {
        code: err.code || "PROVIDER_ERROR",
        message: err.message,
        retryable: err.retryable,
        timestamp: new Date(),
      };
      
      // Refund credits on failure
      const settlement = this.billingService.settleAndRelease(
        { /* initial debit txn */ },
        false
      );
      for (const txn of settlement) {
        await this.creditRepo.recordTransaction(txn);
      }
      
      await this.taskRepo.updateTask(failedTask, message.ownerId);
      
      // Nack to queue with retry if retryable
      await this.queue.nack(
        message.id,
        err.retryable !== false,
        err.message
      );
    }
  }
}
```

**Deliverables:**

- [ ] Queue client is abstracted (RabbitMQ/SQS/Kafka interchangeable)
- [ ] Worker processes are idempotent (duplicate messages do not duplicate outcomes)
- [ ] Failed jobs go to dead-letter queue for triage
- [ ] All state transitions are logged with correlation ID

**Integration test:**
```bash
# Enqueue a job, verify it appears in queue
# Simulate provider timeout, verify auto-retry happens
# Simulate permanent provider error, verify job goes to DLQ
```

---

### Layer 1.5: HTTP Routes (Request → Service → Response)

**Do this fifth:** Thin HTTP layer that delegates to domain and persistence.

**Files:**

1. `backend/src/routes/generation.ts`

```typescript
export function createGenerationRouter(
  generationService: GenerationService,
  taskRepo: ITaskRepository,
  creditRepo: ICreditLedgerRepository,
  queue: IQueueClient,
  billingService: BillingService
): Router {
  const router = Router();

  // POST /api/generation/submit
  router.post("/submit", 
    validateOwnership,
    validateIdempotencyKey,
    async (req, res, next) => {
      try {
        const { prompt, references, provider, config } = req.body;
        const ownerId = req.ownerId;
        const idempotencyKey = req.headers["idempotency-key"] as string;
        const correlationId = req.correlationId;
        
        // Check duplicate by idempotency key
        const existing = await taskRepo.getTaskByIdempotencyKey(idempotencyKey, ownerId);
        if (existing) {
          return res.status(200).json({ taskId: existing.id }); // Idempotent
        }
        
        // Check credits
        const balance = await creditRepo.getBalanceForOwner(ownerId);
        const estimatedCostCents = 10000; // $100 for now, dynamic per provider later
        
        const reservation = billingService.reserveCredits(
          ownerId,
          estimatedCostCents,
          "", // taskId not yet assigned
          balance
        );
        
        // Create task (domain logic)
        const task = generationService.submitTask(
          ownerId,
          {
            provider,
            prompt,
            references: references || [],
            config: config || {},
          },
          idempotencyKey,
          correlationId
        );
        
        // Persist task
        const savedTask = await taskRepo.createTask(task);
        
        // Record credit debit
        const debitTxn = billingService.recordLedgerEntry(
          ownerId,
          "debit",
          estimatedCostCents,
          "Generation task submitted",
          idempotencyKey,
          savedTask.id
        );
        await creditRepo.recordTransaction(debitTxn);
        
        // Enqueue job
        const generationJob: GenerationJob = {
          id: uuid(),
          taskId: savedTask.id,
          ownerId,
          correlationId,
          idempotencyKey,
          input: task.input,
        };
        await queue.enqueue(generationJob);
        
        // Transition to queued
        const queuedTask = generationService.transitionState(
          savedTask,
          "queued",
          "api",
          "Enqueued to generation queue"
        );
        await taskRepo.updateTask(queuedTask, ownerId);
        
        res.status(202).json({
          taskId: savedTask.id,
          status: "queued",
          estimatedCostCents,
          correlationId,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/generation/:taskId
  router.get("/:taskId",
    validateOwnership,
    async (req, res, next) => {
      try {
        const { taskId } = req.params;
        const ownerId = req.ownerId;
        
        const task = await taskRepo.getTaskById(taskId, ownerId);
        if (!task) {
          return res.status(404).json({ error: "Task not found" });
        }
        
        res.json({
          id: task.id,
          state: task.state,
          stateHistory: task.stateHistory,
          submittedAt: task.submittedAt,
          completedAt: task.completedAt,
          output: task.output,
          error: task.error,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
```

**Deliverables:**

- [ ] All routes follow req → service → response pattern
- [ ] No business logic in routes (all in service layer)
- [ ] All routes return consistent JSON shape
- [ ] Error handling delegates to central error middleware

**Integration test:**
```bash
POST /api/generation/submit (with valid JWT and idempotency key)
→ Returns 202 Accepted with taskId
→ Task appears in DB with state="queued"
→ Job appears in queue
```

---

## Phase 2: Frontend Foundation (Days 8-9)

### Layer 2.1: API Client (Typed, Contract-Driven)

**File:** `frontend/src/api/generation-client.ts`

```typescript
import { Task, GenerationInput } from "@toorgen/types";

export class GenerationClient {
  constructor(private baseUrl: string, private getAuthToken: () => Promise<string>) {}

  async submitGeneration(
    input: GenerationInput,
    idempotencyKey: string
  ): Promise<{ taskId: string; correlationId: string }> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}/api/generation/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new AppError(error.code, error.message, response.status);
    }
    
    return response.json();
  }

  async getTask(taskId: string): Promise<Task> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}/api/generation/${taskId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new AppError("FETCH_ERROR", `Failed to fetch task ${taskId}`, response.status);
    }
    
    return response.json();
  }

  async pollTaskUntilComplete(
    taskId: string,
    timeoutMs: number = 600000
  ): Promise<Task> {
    const startTime = Date.now();
    const pollIntervalMs = 1000; // Start at 1s
    let intervalMs = pollIntervalMs;
    
    while (Date.now() - startTime < timeoutMs) {
      const task = await this.getTask(taskId);
      
      if (task.state === "succeeded" || task.state === "failed" || task.state === "canceled") {
        return task;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      intervalMs = Math.min(intervalMs * 1.5, 30000); // Exponential backoff, cap at 30s
    }
    
    throw new AppError("TIMEOUT", `Task ${taskId} did not complete within ${timeoutMs}ms`);
  }
}
```

**Deliverables:**

- [ ] Client is strongly typed with contracts from @toorgen/types
- [ ] All API errors are normalized to AppError
- [ ] Polling logic includes exponential backoff and timeout
- [ ] Idempotency key is always sent

---

### Layer 2.2: React Hooks for Task Management

**File:** `frontend/src/hooks/useGenerationTask.ts`

```typescript
export function useGenerationTask() {
  const client = useApiClient(); // Injected via context
  const [state, setState] = useState<{
    status: "idle" | "submitting" | "polling" | "succeeded" | "failed";
    task?: Task;
    error?: AppError;
  }>({ status: "idle" });

  const submit = useCallback(async (input: GenerationInput) => {
    setState({ status: "submitting" });
    
    try {
      const idempotencyKey = uuid();
      const { taskId, correlationId } = await client.submitGeneration(input, idempotencyKey);
      
      setState({ status: "polling", task: { id: taskId, state: "queued" } });
      
      const completed = await client.pollTaskUntilComplete(taskId);
      
      setState({ status: completed.state === "succeeded" ? "succeeded" : "failed", task: completed });
    } catch (err) {
      setState({ status: "failed", error: err });
    }
  }, [client]);

  return { ...state, submit };
}
```

**Deliverables:**

- [ ] Hook encapsulates submit + poll logic
- [ ] State machine prevents invalid state transitions in UI
- [ ] Error is always present if status is "failed"

---

## Phase 3: Integration and Observability (Days 10-12)

### Layer 3.1: Logging and Tracing

**Files:**

1. `backend/src/lib/logger.ts`

```typescript
export function createLogger(correlationId: string) {
  return {
    info: (message: string, meta: any = {}) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message,
        correlationId,
        ...meta,
      }));
    },
    error: (message: string, err: any, meta: any = {}) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message,
        error: err.message,
        errorCode: err.code,
        correlationId,
        ...meta,
      }));
    },
  };
}
```

2. `frontend/src/lib/logger.ts`

```typescript
export function logEvent(event: string, data: any = {}, correlationId?: string) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    correlationId,
    ...data,
  }));
}
```

**Deliverables:**

- [ ] All logs include correlationId
- [ ] Logs are JSON-formatted for easy parsing
- [ ] Frontend logs include task state transitions

---

### Layer 3.2: Metrics and Monitoring

**Files:**

1. `backend/src/middleware/metrics.ts`

```typescript
const promClient = require("prom-client");

export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});

export const generationTasksTotal = new promClient.Counter({
  name: "generation_tasks_total",
  help: "Total generation tasks submitted",
  labelNames: ["status"],
});

export const creditTransactionsTotal = new promClient.Counter({
  name: "credit_transactions_total",
  help: "Total credit transactions",
  labelNames: ["type"],
});

export const queueDepth = new promClient.Gauge({
  name: "queue_depth",
  help: "Current queue depth",
});
```

**Deliverables:**

- [ ] Prometheus metrics exported at `/metrics`
- [ ] Dashboards defined for queue depth, task success rate, credit burn
- [ ] Alerts configured for queue lag > 5min and task failure rate > 5%

---

## Phase 4: Payment and Credits (Days 13-16)

### Layer 4.1: Payment Gateway Integration

**File:** `backend/src/routes/payments.ts`

```typescript
export function createPaymentRouter(
  creditRepo: ICreditLedgerRepository,
  stripe: Stripe // Stripe SDK
): Router {
  const router = Router();

  router.post("/checkout", validateOwnership, async (req, res) => {
    const { priceId, amountCents } = req.body;
    const ownerId = req.ownerId;
    const idempotencyKey = req.headers["idempotency-key"] as string;
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: amountCents / 10000 }],
      mode: "payment",
      idempotency_key: idempotencyKey,
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      client_reference_id: ownerId,
    });
    
    res.json({ sessionId: session.id });
  });

  router.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    const idempotencyKey = `stripe-${event.id}`;
    
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const ownerId = session.client_reference_id;
      const amountCents = Math.round(session.amount_total * 100) / 100;
      
      // Record payment event
      const paymentEvent: PaymentEvent = {
        id: uuid(),
        ownerId,
        provider: "stripe",
        externalId: session.id,
        amountCents,
        status: "succeeded",
        createdAt: new Date(),
        settledAt: new Date(),
        idempotencyKey,
      };
      
      // Record credit purchase transaction
      const creditTxn = billingService.recordLedgerEntry(
        ownerId,
        "purchase",
        amountCents,
        `Payment from ${paymentEvent.provider}`,
        idempotencyKey,
        undefined,
        session.id
      );
      
      await creditRepo.recordTransaction(creditTxn);
    }
    
    res.json({ received: true });
  });

  return router;
}
```

**Deliverables:**

- [ ] Checkout creates Stripe session with idempotency
- [ ] Webhook consumer is replay-safe
- [ ] Payment events reconcile daily

---

## Final Integration Checklist

- [ ] All middleware and domain services deployed to backend
- [ ] All routes tested with integration tests
- [ ] Frontend API client works end-to-end
- [ ] Queue processes jobs successfully
- [ ] Logging captures full request traces
- [ ] Metrics dashboard is live
- [ ] Payment flow works in test mode

## Deployment Readiness

Once all layers pass integration tests:

1. Deploy backend to staging
2. Deploy frontend to staging
3. Run end-to-end test: submit generation → queue processes → return result
4. Run billing test: purchase credits → submit generation → settlement recorded
5. Run chaos: simulate provider timeout, verify retry and refund
6. Roll to production with feature flags (all paths behind toggles initially)

## Result: Zero Technical Debt

- No cross-tenant leaks (ownership enforced at every layer)
- No duplicate jobs (idempotency keys on submission and provider calls)
- No lost state (server-authoritative, immutable logs)
- No refund disputes (ledger reconciles with payment provider)
- No broken workflows (explicit contracts at every boundary)

This greenfield approach takes 16 days to reach production-ready state, with zero rework needed later.
