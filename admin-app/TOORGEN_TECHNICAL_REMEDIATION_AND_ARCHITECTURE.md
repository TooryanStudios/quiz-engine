# ToorGen Technical Remediation & Architecture Guide
**Version:** 2.0  
**Date:** May 17, 2026  
**Scope:** Full application refactor with subsystem segregation, security hardening, and industry-standard resilience  
**Target State:** Production-grade, rock-solid, fully observable generation platform  

---

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Subsystem Segregation](#subsystem-segregation)
3. [Database Design (MongoDB)](#database-design-mongodb)
4. [Queue System Architecture](#queue-system-architecture)
5. [Security Hardening](#security-hardening)
6. [API Contract and Request/Submission System](#api-contract-and-requestsubmission-system)
7. [Data Persistence and Recovery](#data-persistence-and-recovery)
8. [Text Prompt Vectorization](#text-prompt-vectorization)
9. [Deployment and Operational Strategies](#deployment-and-operational-strategies)
10. [Implementation Roadmap](#implementation-roadmap)

---

## System Architecture Overview

### High-Level Design (Post-Refactor)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (React/SPA)                        │
│  - UI: ToorGen Simple Studio, Flow Canvas, Prompt Lab                   │
│  - Local State: Minimal (active prompt, UI interactions only)           │
│  - No persistent queue/history client-side                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓↑
┌─────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY & SECURITY LAYER                          │
│  - Authentication (JWT, OAuth2)                                          │
│  - Rate Limiting (Token Bucket)                                          │
│  - Request Validation & Sanitization                                     │
│  - Correlation ID & Audit Logging                                        │
│  - CORS & Security Headers                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓↑
┌──────────────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATION LAYER                                 │
│  - Request Router (directs to appropriate subsystem)                      │
│  - Transaction Coordinator (multi-subsystem workflows)                    │
│  - Event Bus (Kafka/RabbitMQ for inter-subsystem communication)           │
│  - Idempotency Service (dedup & replay)                                   │
└──────────────────────────────────────────────────────────────────────────┘
                  ↓↑                  ↓↑                  ↓↑
    ┌─────────────────────┐  ┌──────────────┐  ┌──────────────┐
    │  TEXT SUBSYSTEM     │  │ IMAGE SUBSYS │  │ VIDEO SUBSYS │
    └─────────────────────┘  └──────────────┘  └──────────────┘
    ↓↑                        ↓↑                 ↓↑
    │                         │                  │
    └─────────────────────┐───┴──────────────────┴────────────┐
                          ↓
                  ┌──────────────────┐
                  │ AUDIO SUBSYSTEM  │
                  └──────────────────┘
                          ↓
    ┌─────────────────────┴─────────────────────────────────┐
    │          PERSISTENCE & STORAGE LAYER                  │
    │  - MongoDB (task queue, history, references, config)  │
    │  - Firebase Storage / S3 (transient media)             │
    │  - Archive Storage / Glacier (long-term retention)     │
    │  - Redis (cache, session state)                        │
    └─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Subsystem Segregation:** Each media type (text, image, video, audio) is independently deployable and scalable.
2. **Queue-Driven:** All requests enter a durable queue; subsystems pull from queues.
3. **Event-Driven:** Subsystems communicate via events, not direct calls.
4. **Server-Side State Truth:** Database is single source of truth; client is stateless viewer.
5. **Observability:** Every operation logged with correlation ID; full audit trail.
6. **Security-First:** Encryption at rest/transit, secrets management, least privilege.
7. **Resilience:** Timeouts, retries, circuit breakers, graceful degradation.
8. **Scalability:** Horizontal scaling via stateless services, managed queues, and caching.

---

## Subsystem Segregation

### Architecture: Four Independent Subsystems + Shared Services

```
TEXT SUBSYSTEM
├─ Input Validation & Normalization
├─ Prompt Enhancement (AI-powered)
├─ Embedding Generation (OpenAI, Hugging Face)
├─ Vectorization & Storage
├─ Policy Compliance Checks
└─ Output: Enhanced Prompts, Embeddings, Policy Metadata

IMAGE SUBSYSTEM
├─ Input Upload & Validation
├─ Format Normalization (PNG/JPG/WebP)
├─ Metadata Extraction (EXIF, dimensions)
├─ Content Moderation (optionally)
├─ Signing & URL Generation
├─ Storage Management (transient/archive)
└─ Output: Normalized Images, Metadata, Signed URLs

VIDEO SUBSYSTEM
├─ Input Upload & Validation
├─ Frame Extraction & Thumbnail Generation
├─ Duration & Codec Analysis
├─ Proxy & CORS Handling
├─ Signature & Watermark Injection (optional)
├─ Storage & Archival
└─ Output: Video Assets, Thumbnails, Duration Metadata

AUDIO SUBSYSTEM
├─ Input Upload & Validation
├─ Format Conversion (MP3, WAV, AAC)
├─ Waveform Analysis
├─ Metadata Extraction (bitrate, duration)
├─ Storage & Lifecycle Management
└─ Output: Normalized Audio, Waveform Data

SHARED SERVICES
├─ Queue Manager (Bull Redis, AWS SQS, or RabbitMQ)
├─ Task Coordinator (state machine, idempotency)
├─ Storage Service (Firebase, AWS S3, abstractions)
├─ Config & Secrets Manager
├─ Auth & RBAC Service
├─ Audit & Logging Service
├─ Metrics & Observability
└─ Provider Integration (Seedance API, Atlas, Grok, etc.)
```

### Subsystem Deployment Model

```yaml
TEXT_SERVICE:
  container: text-subsystem:latest
  replicas: 3
  resources: {cpu: 500m, memory: 1Gi}
  env: EMBEDDING_MODEL=text-embedding-3-small
  
IMAGE_SERVICE:
  container: image-subsystem:latest
  replicas: 2
  resources: {cpu: 1000m, memory: 2Gi}
  env: MAX_IMAGE_SIZE=50MB
  
VIDEO_SERVICE:
  container: video-subsystem:latest
  replicas: 2
  resources: {cpu: 2000m, memory: 4Gi}
  env: MAX_VIDEO_SIZE=500MB, CODEC=h264
  
AUDIO_SERVICE:
  container: audio-subsystem:latest
  replicas: 1
  resources: {cpu: 500m, memory: 1Gi}
  env: MAX_AUDIO_SIZE=100MB
```

### Subsystem Communication Protocol

**Inter-subsystem requests use async event bus (Kafka/RabbitMQ), NOT direct HTTP.**

```json
EVENT: "text.prompt.enhanced"
{
  "event_id": "evt_abc123",
  "correlation_id": "req_xyz789",
  "timestamp": "2026-05-17T14:00:00Z",
  "source": "text-subsystem",
  "payload": {
    "prompt_id": "prompt_123",
    "original": "A dog playing fetch",
    "enhanced": "A happy golden retriever playing fetch in a sunny park...",
    "embeddings": [0.123, 0.456, ...],
    "policy_flags": ["safe", "no_violence"]
  }
}
```

---

## Database Design (MongoDB)

### Schema Design Philosophy

- **Normalized by subsystem:** Each subsystem owns its data.
- **Event sourcing:** Immutable event log for audit and replay.
- **Soft deletes:** Retention policies respected; hard delete only after TTL.
- **Indexes on hot paths:** creation_at, user_id, project_id, status.

### Collections

#### 1. `generation_requests` (Core Task Entity)
```javascript
db.generation_requests.insertOne({
  _id: ObjectId("..."),
  request_id: "req_xyz789",           // Idempotency key
  correlation_id: "corr_abc123",      // Trace across system
  user_id: "user_123",
  project_id: "proj_456",
  
  // Request metadata
  request_type: "text-to-video",      // Enum: text-to-video, image-to-video, etc.
  requested_model: "seedance-2.0-fast",
  requested_provider: "atlas",        // Enum: atlas, byteplus, grok
  parameters: {
    duration: 5,
    aspect_ratio: "16:9",
    resolution: "720p",
    generate_audio: true,
    quality_preset: "720p"
  },
  
  // Lifecycle
  status: "SUBMITTED",                // Enum: SUBMITTED, QUEUED, IN_PROGRESS, SUCCESS, FAILED, CANCELLED
  submitted_at: ISODate("2026-05-17T14:00:00Z"),
  started_at: null,
  completed_at: null,
  
  // Results
  task_id: "task_456",                // Provider task ID
  effective_model: "seedance-2.0-fast",
  effective_provider: "atlas",
  fallback_applied: false,
  fallback_reason: null,
  
  output_video_url: null,
  output_duration_sec: null,
  output_dimensions: "1280x720",
  firebase_video_url: null,           // Persisted copy
  
  // Error handling
  error_message: null,
  error_code: null,
  retry_count: 0,
  max_retries: 3,
  last_retry_at: null,
  
  // Cost tracking
  estimated_credits: 10,
  consumed_credits: null,
  cost_usd: null,
  
  // Media references
  text_refs: [{
    kind: "prompt",
    value: "A golden retriever playing fetch...",
    vectorized: true,
    embedding_id: "emb_123"
  }],
  image_refs: [{
    kind: "reference",
    role: "identity",
    url: "https://signed-url...",
    storage_path: "toorgen-lab/img_123.jpg",
    size_bytes: 2048000,
    dimensions: "1920x1080"
  }],
  video_refs: [{
    kind: "motion",
    url: "https://signed-url...",
    storage_path: "toorgen-lab/vid_123.mp4",
    duration_sec: 5
  }],
  audio_refs: [{
    kind: "timing",
    url: "https://signed-url...",
    storage_path: "toorgen-lab/aud_123.mp3",
    duration_sec: 10
  }],
  
  // Audit
  created_at: ISODate("2026-05-17T14:00:00Z"),
  updated_at: ISODate("2026-05-17T14:00:30Z"),
  deleted_at: null,                   // Soft delete
  retention_policy: "transient",      // Enum: transient (7d), reference (30d), archive (1y)
  
  // Metadata
  tags: ["batch_001", "campaign_q2"],
  notes: "Re-render with different style",
  
  // Versioning
  version: 1,
  source_request_id: null             // If forked from another request
})

db.generation_requests.createIndex({ request_id: 1 }, { unique: true })
db.generation_requests.createIndex({ correlation_id: 1 })
db.generation_requests.createIndex({ user_id: 1, created_at: -1 })
db.generation_requests.createIndex({ project_id: 1, status: 1 })
db.generation_requests.createIndex({ status: 1, created_at: 1 })
```

#### 2. `text_prompts` (Text Subsystem)
```javascript
db.text_prompts.insertOne({
  _id: ObjectId("..."),
  prompt_id: "prompt_123",
  
  user_id: "user_123",
  project_id: "proj_456",
  
  // Original input
  original_text: "A dog playing fetch",
  language: "en",
  
  // Enhanced version
  enhanced_text: "A happy golden retriever playing fetch in a sunny park, action shot...",
  enhancement_model: "gpt-4",
  enhanced_at: ISODate("2026-05-17T14:00:00Z"),
  
  // Embeddings (vectorization)
  embeddings: {
    model: "text-embedding-3-small",
    dimensions: 1536,
    vector: [0.123, 0.456, ..., 0.789],
    generated_at: ISODate("2026-05-17T14:00:00Z")
  },
  
  // Policy & compliance
  policy_checks: {
    flagged: false,
    flags: ["safe", "no_violence", "no_explicit"],
    confidence: 0.98
  },
  
  // Metadata
  character_count: 45,
  token_count: 12,
  quality_score: 0.92,
  
  created_at: ISODate("2026-05-17T14:00:00Z"),
  updated_at: ISODate("2026-05-17T14:00:00Z"),
  deleted_at: null,
  retention_ttl_days: 30,
  
  version: 1
})

db.text_prompts.createIndex({ prompt_id: 1 }, { unique: true })
db.text_prompts.createIndex({ user_id: 1, created_at: -1 })
db.text_prompts.createIndex({ embeddings.vector: "2dsphere" })  // For similarity search
```

#### 3. `image_references` (Image Subsystem)
```javascript
db.image_references.insertOne({
  _id: ObjectId("..."),
  image_id: "img_123",
  
  user_id: "user_123",
  project_id: "proj_456",
  
  // Upload & source
  original_filename: "character_ref.jpg",
  source_type: "uploaded",            // uploaded, generated, url-import
  original_url: null,
  
  // Storage
  storage_path: "toorgen-lab/images/img_123.jpg",
  firebase_url: "https://firebasestorage.googleapis.com/...",
  signed_url: "https://firebasestorage.googleapis.com/...?token=abc123",
  signed_url_expires_at: ISODate("2026-05-17T15:00:00Z"),
  
  // Metadata
  format: "jpeg",
  mime_type: "image/jpeg",
  size_bytes: 2048000,
  width_px: 1920,
  height_px: 1080,
  aspect_ratio: "16:9",
  
  // Content analysis
  content_moderation: {
    flagged: false,
    scores: { violence: 0.01, sexual: 0.02 }
  },
  
  // Role in generation
  roles: ["reference_image", "character_identity"],
  
  created_at: ISODate("2026-05-17T14:00:00Z"),
  updated_at: ISODate("2026-05-17T14:00:00Z"),
  last_accessed_at: ISODate("2026-05-17T14:00:00Z"),
  deleted_at: null,
  retention_ttl_days: 30,
  
  version: 1
})

db.image_references.createIndex({ image_id: 1 }, { unique: true })
db.image_references.createIndex({ user_id: 1, created_at: -1 })
db.image_references.createIndex({ storage_path: 1 })
```

#### 4. `video_references` (Video Subsystem)
```javascript
db.video_references.insertOne({
  _id: ObjectId("..."),
  video_id: "vid_123",
  
  user_id: "user_123",
  project_id: "proj_456",
  
  // Upload & source
  original_filename: "motion_ref.mp4",
  source_type: "generated",           // generated, uploaded, url-import
  source_generation_id: null,
  
  // Storage
  storage_path: "toorgen-lab/videos/vid_123.mp4",
  firebase_url: "https://firebasestorage.googleapis.com/...",
  signed_url: "https://firebasestorage.googleapis.com/...?token=xyz789",
  signed_url_expires_at: ISODate("2026-05-17T15:00:00Z"),
  
  // Metadata
  format: "mp4",
  mime_type: "video/mp4",
  codec: "h264",
  size_bytes: 51200000,
  duration_sec: 5,
  fps: 24,
  width_px: 1920,
  height_px: 1080,
  bitrate_kbps: 8000,
  
  // Frames & thumbnails
  thumbnail_path: "toorgen-lab/thumbnails/vid_123_thumb.jpg",
  frame_count: 120,
  
  // Roles
  roles: ["motion_reference", "extend_source"],
  
  created_at: ISODate("2026-05-17T14:00:00Z"),
  updated_at: ISODate("2026-05-17T14:00:00Z"),
  last_accessed_at: ISODate("2026-05-17T14:00:00Z"),
  deleted_at: null,
  retention_ttl_days: 7,
  
  version: 1
})

db.video_references.createIndex({ video_id: 1 }, { unique: true })
db.video_references.createIndex({ user_id: 1, created_at: -1 })
db.video_references.createIndex({ duration_sec: 1 })
```

#### 5. `audio_references` (Audio Subsystem)
```javascript
db.audio_references.insertOne({
  _id: ObjectId("..."),
  audio_id: "aud_123",
  
  user_id: "user_123",
  project_id: "proj_456",
  
  // Upload & source
  original_filename: "voiceover.mp3",
  source_type: "uploaded",
  
  // Storage
  storage_path: "toorgen-lab/audio/aud_123.mp3",
  firebase_url: "https://firebasestorage.googleapis.com/...",
  
  // Metadata
  format: "mp3",
  mime_type: "audio/mpeg",
  codec: "mp3",
  size_bytes: 2048000,
  duration_sec: 60,
  bitrate_kbps: 128,
  sample_rate_hz: 44100,
  channels: 2,
  
  // Audio analysis
  waveform_data: [0.1, 0.2, ..., 0.05],  // Simplified waveform for UI
  
  // Role
  roles: ["timing_reference", "background_score"],
  
  created_at: ISODate("2026-05-17T14:00:00Z"),
  updated_at: ISODate("2026-05-17T14:00:00Z"),
  deleted_at: null,
  retention_ttl_days: 30,
  
  version: 1
})

db.audio_references.createIndex({ audio_id: 1 }, { unique: true })
db.audio_references.createIndex({ user_id: 1, created_at: -1 })
```

#### 6. `generation_queue` (Bull/RabbitMQ backing)
```javascript
db.generation_queue.insertOne({
  _id: ObjectId("..."),
  queue_id: "queue_123",
  
  request_id: "req_xyz789",            // Link to generation_requests
  
  // Queue state
  status: "PENDING",                   // PENDING, PROCESSING, COMPLETED, FAILED
  assigned_to_subsystem: "video",      // video, audio, image, text
  
  attempt: 1,
  max_attempts: 3,
  
  // Timing
  enqueued_at: ISODate("2026-05-17T14:00:00Z"),
  processing_started_at: null,
  processing_completed_at: null,
  
  // Retry logic
  backoff_multiplier: 2,
  next_retry_at: null,
  
  // Error tracking
  error_message: null,
  error_stack: null,
  
  // Dead letter queue
  is_dlq: false,
  dlq_reason: null,
  
  version: 1
})

db.generation_queue.createIndex({ status: 1, assigned_to_subsystem: 1 })
db.generation_queue.createIndex({ request_id: 1 }, { unique: true })
db.generation_queue.createIndex({ next_retry_at: 1 })
```

#### 7. `audit_events` (Immutable Audit Trail)
```javascript
db.audit_events.insertOne({
  _id: ObjectId("..."),
  event_id: "evt_abc123",
  
  correlation_id: "req_xyz789",
  user_id: "user_123",
  project_id: "proj_456",
  
  // Event classification
  event_type: "generation.submitted",  // generation.*, upload.*, access.*
  action: "CREATE",                    // CREATE, UPDATE, DELETE, ACCESS
  resource_type: "generation_request",
  resource_id: "req_xyz789",
  
  // Details
  details: {
    request_type: "text-to-video",
    model: "seedance-2.0-fast",
    duration: 5
  },
  
  // Outcome
  success: true,
  error_message: null,
  
  // Client info
  client_ip: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  
  timestamp: ISODate("2026-05-17T14:00:00Z"),
  
  // Retention
  retention_ttl_days: 365
})

db.audit_events.createIndex({ correlation_id: 1 })
db.audit_events.createIndex({ user_id: 1, timestamp: -1 })
db.audit_events.createIndex({ event_type: 1, timestamp: -1 })
```

#### 8. `idempotency_keys` (Dedup & Replay)
```javascript
db.idempotency_keys.insertOne({
  _id: ObjectId("..."),
  idempotency_key: "req_xyz789",
  
  // Original request
  request_hash: "sha256_abcd1234",
  user_id: "user_123",
  
  // Result (for replay)
  response_status: 200,
  response_body: { task_id: "task_456", status: "SUBMITTED" },
  
  // Timing
  first_received_at: ISODate("2026-05-17T14:00:00Z"),
  expires_at: ISODate("2026-05-17T15:00:00Z"),  // 1-hour TTL
  
  version: 1
})

db.idempotency_keys.createIndex({ idempotency_key: 1 }, { unique: true })
db.idempotency_keys.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
```

---

## Queue System Architecture

### Industry-Standard: Event-Driven Queue with Retries, DLQ, and Circuit Breaker

```
┌─────────────────┐
│  API Gateway    │
│  (Validation)   │
└────────┬────────┘
         │ (Validated Request)
         ↓
┌──────────────────────────────┐
│ Idempotency Check Service    │
│ - Check if req_id seen       │
│ - Return cached response     │
│ - Generate correlation_id    │
└────────┬─────────────────────┘
         │ (New or retry)
         ↓
┌──────────────────────────────┐
│  Request Normalization       │
│  - Sanitize prompts          │
│  - Validate media URLs       │
│  - Build canonical form      │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────┐
│         KAFKA / RABBITMQ / REDIS STREAMS QUEUE           │
│  ┌────────────┬────────────┬────────────┬─────────────┐  │
│  │  Text      │  Image     │  Video     │  Audio      │  │
│  │  Queue     │  Queue     │  Queue     │  Queue      │  │
│  │ (partition)│(partition) │(partition) │(partition)  │  │
│  └────────────┴────────────┴────────────┴─────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Dead Letter Queue (DLQ) - Max retries exceeded │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
     ↑↓                    ↑↓                 ↑↓
  Text Worker         Image Worker       Video Worker
  (3 replicas)        (2 replicas)       (2 replicas)
     │                    │                   │
     └────────┬───────────┴───────────────────┘
              ↓
    ┌──────────────────────┐
    │ Task Coordinator     │
    │ - State tracking     │
    │ - Event emission     │
    │ - Timeout handling   │
    └──────────┬───────────┘
              ↓
    ┌──────────────────────────┐
    │ MongoDB (Task State)     │
    │ - generation_requests    │
    │ - generation_queue       │
    │ - audit_events           │
    └──────────────────────────┘
```

### Queue Item Schema
```json
{
  "queue_message_id": "msg_abc123",
  "correlation_id": "corr_xyz789",
  "request_id": "req_xyz789",
  "idempotency_key": "idem_key",
  
  "type": "GENERATION_REQUEST",
  "target_subsystem": "video",
  
  "payload": {
    "request_type": "text-to-video",
    "prompt": "A golden retriever...",
    "duration": 5,
    "aspect_ratio": "16:9",
    "model": "seedance-2.0-fast",
    "provider": "atlas"
  },
  
  "metadata": {
    "user_id": "user_123",
    "project_id": "proj_456",
    "priority": 5,
    "timeout_sec": 300
  },
  
  "retry_policy": {
    "attempt": 1,
    "max_attempts": 3,
    "backoff_seconds": 10,
    "backoff_multiplier": 2
  },
  
  "enqueued_at": "2026-05-17T14:00:00Z"
}
```

### Worker Processing Loop (Pseudo-code)

```typescript
async function processQueueItem(msg: QueueMessage): Promise<void> {
  const { correlation_id, request_id, payload, retry_policy } = msg;
  
  try {
    // 1. Log start
    await auditLog.log({
      event_type: "task.processing.started",
      correlation_id,
      request_id
    });
    
    // 2. Validate & normalize
    const validated = validateRequest(payload);
    
    // 3. Execute generation
    const result = await generateVideo(validated);
    
    // 4. Persist result
    await db.generation_requests.updateOne(
      { request_id },
      {
        status: "SUCCESS",
        output_video_url: result.url,
        completed_at: new Date(),
        consumed_credits: result.credits
      }
    );
    
    // 5. Emit success event
    await eventBus.emit("generation.completed", {
      request_id,
      correlation_id,
      output_url: result.url
    });
    
  } catch (error) {
    const retryCount = retry_policy.attempt;
    const maxRetries = retry_policy.max_attempts;
    
    if (retryCount < maxRetries) {
      // Exponential backoff retry
      const backoffMs = calculateBackoff(
        retry_policy.backoff_seconds,
        retry_policy.backoff_multiplier,
        retryCount
      );
      
      await queue.scheduleRetry(msg, backoffMs);
      
      await auditLog.log({
        event_type: "task.retry.scheduled",
        correlation_id,
        request_id,
        attempt: retryCount + 1,
        backoff_ms: backoffMs
      });
    } else {
      // Max retries exceeded -> DLQ
      await queue.sendToDLQ(msg, error.message);
      
      await db.generation_requests.updateOne(
        { request_id },
        {
          status: "FAILED",
          error_message: error.message,
          completed_at: new Date()
        }
      );
      
      await eventBus.emit("generation.failed", {
        request_id,
        correlation_id,
        error: error.message
      });
    }
    
    throw error;  // Re-throw for monitoring
  }
}
```

### Backoff Strategy (Industry Standard: Exponential with Jitter)

```typescript
function calculateBackoff(
  baseSeconds: number,
  multiplier: number,
  attemptNum: number
): number {
  const exponential = baseSeconds * Math.pow(multiplier, attemptNum);
  const jitter = Math.random() * exponential * 0.1;  // ±10% jitter
  return (exponential + jitter) * 1000;  // Convert to ms
}

// Attempts: 10s, 20s, 40s backoff (+ jitter)
// Total max retry time: ~70s before DLQ
```

---

## Security Hardening

### 1. Authentication & Authorization

#### Multi-Layer Auth Strategy
```
┌─────────────┐
│  API Key    │  (Service-to-service)
├─────────────┤
│  JWT Token  │  (User sessions, OAuth2 flow)
├─────────────┤
│  RBAC       │  (Role-based access control)
├─────────────┤
│  Scopes     │  (Permissions per operation)
└─────────────┘
```

#### Implementation (Node.js/Express)
```typescript
// Middleware: Extract & Validate JWT
app.use(expressJwt({
  secret: secrets.JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "user"
}));

// Middleware: Check RBAC
async function rbac(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { user_id, roles } = req.user;
    const hasPermission = await authService.canDo(user_id, roles, resource, action);
    
    if (!hasPermission) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}

// Protected endpoint
app.post("/api/generation/submit", 
  rbac("generation_request", "create"),
  async (req: Request, res: Response) => {
    // Handler
  }
);
```

### 2. Request Validation & Sanitization

```typescript
import { body, param, validationResult } from "express-validator";
import DOMPurify from "isomorphic-dompurify";

// Prompt validation chain
const validatePrompt = [
  body("prompt")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Prompt must be 1-2000 characters"),
  body("prompt")
    .custom((value) => {
      // Check for injection patterns
      if (/(%00|<script|javascript:|onerror|onload)/i.test(value)) {
        throw new Error("Prompt contains invalid patterns");
      }
      return true;
    }),
  body("prompt")
    .custom((value) => {
      // Normalize and sanitize
      return !DOMPurify.sanitize(value).includes("script");
    })
];

// Reference URL validation
const validateReferenceUrl = [
  body("url")
    .isURL({ protocols: ["https"] })
    .withMessage("Must be HTTPS URL"),
  body("url")
    .custom((value) => {
      // Allowlist check
      const allowedDomains = [
        "firebasestorage.googleapis.com",
        "s3.amazonaws.com",
        "cloudfront.net"
      ];
      return allowedDomains.some(d => value.includes(d));
    })
    .withMessage("URL domain not whitelisted")
];

app.post("/api/generation/submit",
  validatePrompt,
  validateReferenceUrl,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Handler
  }
);
```

### 3. SSRF Protection (Proxy & URL Handling)

```typescript
const URL_ALLOWLIST = [
  "firebasestorage.googleapis.com",
  "s3.amazonaws.com",
  "seedance-cdn.com",
  "atlas-assets.com"
];

const BLOCKED_PATTERNS = [
  /^http:\/\/127\.0\.0\.1/,
  /^http:\/\/localhost/,
  /^http:\/\/169\.254\./,        // Link-local
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[01])\./,  // Private IP ranges
  /^http:\/\/10\./,
  /^http:\/\/192\.168\./,
  /metadata\.google\.internal/,   // GCP metadata
  /169\.254\.169\.254/,            // AWS metadata
  /api\.aliyun\.com/,              // Alibaba metadata
];

async function validateAndProxyUrl(url: string): Promise<Blob> {
  // 1. Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (e) {
    throw new Error("Invalid URL");
  }
  
  // 2. Block private/metadata endpoints
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(url)) {
      throw new Error("URL blocked for security");
    }
  }
  
  // 3. Whitelist check
  if (!URL_ALLOWLIST.some(d => parsed.hostname?.endsWith(d))) {
    throw new Error("Domain not whitelisted");
  }
  
  // 4. Fetch with timeout & size limits
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);  // 30s timeout
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ToorGen/1.0" }
    });
    
    // 5. Validate response
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("video/") && !contentType?.startsWith("image/")) {
      throw new Error("Invalid content type");
    }
    
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 500 * 1024 * 1024) {
      throw new Error("File too large");
    }
    
    return await response.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4. Rate Limiting & Quota Management

```typescript
import RedisStore from "rate-limit-redis";
import rateLimit from "express-rate-limit";

const redisClient = redis.createClient();

// Global rate limiter (all endpoints)
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:global"
  }),
  windowMs: 60 * 1000,              // 1 minute
  max: 1000,                         // 1000 requests per minute globally
  message: "Too many requests"
});

// Per-user limiter
const userLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:user"
  }),
  keyGenerator: (req: Request) => req.user?.user_id || req.ip,
  windowMs: 60 * 60 * 1000,         // 1 hour
  max: 100,                          // 100 reqs per hour per user
  skip: (req: Request) => req.user?.role === "admin"
});

// Per-project quota (credits)
async function checkProjectQuota(req: Request, res: Response, next: NextFunction) {
  const { project_id } = req.params;
  const { estimated_credits } = req.body;
  
  const project = await db.projects.findOne({ _id: project_id });
  const availableCredits = project.credits_balance;
  
  if (availableCredits < estimated_credits) {
    return res.status(402).json({
      error: "Insufficient credits",
      available: availableCredits,
      required: estimated_credits
    });
  }
  
  next();
}

// Apply limiters
app.use(globalLimiter);
app.post("/api/generation/submit", userLimiter, checkProjectQuota, async (req, res) => {
  // Handler
});
```

### 5. Encryption at Rest & in Transit

```typescript
// Firebase Storage with Application-Managed Keys (CMEK)
const storage = new Storage({
  projectId: "project-id",
  keyFilename: "/path/to/key.json"
});

// Encrypt sensitive fields in MongoDB
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;  // 256-bit key from secrets manager

function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  
  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptField(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  
  return decrypted;
}

// Store encrypted in DB
await db.generation_requests.updateOne(
  { request_id },
  { $set: { encrypted_prompt: encryptField(prompt) } }
);
```

### 6. Audit Logging with Correlation IDs

```typescript
import { v4 as uuidv4 } from "uuid";

// Middleware: Attach correlation ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers["x-correlation-id"] as string || uuidv4();
  req.correlation_id = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Logger: Include correlation ID
class AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    const enriched = {
      event_id: uuidv4(),
      timestamp: new Date(),
      ...event
    };
    
    await db.audit_events.insertOne(enriched);
    console.log("[AUDIT]", JSON.stringify(enriched));
  }
}

// Usage
const auditLog = new AuditLogger();

await auditLog.log({
  correlation_id: req.correlation_id,
  user_id: req.user.user_id,
  event_type: "generation.submitted",
  resource_id: requestId,
  details: { model, duration },
  success: true
});
```

---

## API Contract and Request/Submission System

### Submission Flow with Idempotency

```typescript
/**
 * POST /api/generation/submit
 * Submit a new generation request.
 * 
 * Idempotent: If idempotency_key is provided, repeated calls return same response.
 */

interface GenerationSubmitRequest {
  // Idempotency
  idempotency_key: string;  // UUID v4; client generates; used for dedup
  
  // Request config
  request_type: "text-to-video" | "image-to-video" | "reference-to-video" | "video-extension";
  
  // Prompt & references
  prompt: string;           // 1-2000 chars; enhanced server-side
  image_urls?: string[];    // For image-to-video
  video_urls?: string[];    // For motion/extend reference
  audio_urls?: string[];    // For timing reference
  
  // Generation params
  duration: 5 | 10 | 15;
  aspect_ratio: "16:9" | "9:16" | "4:3" | "3:4";
  resolution: "480p" | "720p" | "1080p";
  generate_audio: boolean;
  
  // Model selection
  model: "seedance-2.0-fast" | "atlas-2.0" | "seedance-2.0" | "grok-imagine-video";
  provider?: "atlas" | "byteplus" | "grok";  // Optional; inferred from model
  
  // Metadata
  project_id: string;
  tags?: string[];
  notes?: string;
}

interface GenerationSubmitResponse {
  // Success
  request_id: string;       // Unique identifier for this request
  correlation_id: string;   // For tracing
  task_id: string;          // Provider task ID (if assigned immediately)
  
  // Status
  status: "SUBMITTED" | "QUEUED" | "IN_PROGRESS";
  
  // Timing
  submitted_at: ISO8601;
  
  // Cost estimate
  estimated_credits: number;
  
  // Polling info
  poll_url: string;         // GET /api/generation/:request_id/status
  poll_interval_ms: number; // Recommended poll interval
}

// Implementation
app.post("/api/generation/submit", 
  authenticateJWT,
  rbac("generation_request", "create"),
  validateGenerationRequest,
  rateLimitPerUser,
  checkProjectQuota,
  async (req: Request, res: Response) => {
    const { idempotency_key, ...payload } = req.body;
    const user_id = req.user.user_id;
    const project_id = req.body.project_id;
    
    // 1. Check idempotency
    const cached = await db.idempotency_keys.findOne({ idempotency_key });
    if (cached && Date.now() < cached.expires_at.getTime()) {
      return res.status(200).json(cached.response_body);
    }
    
    // 2. Generate IDs
    const request_id = uuidv4();
    const correlation_id = req.correlation_id;
    
    // 3. Normalize prompt (enhancement, embedding, policy check)
    const enhanced = await textSubsystem.enhanceAndValidatePrompt(payload.prompt);
    
    // 4. Validate media references
    const validatedRefs = await validateReferences(payload);
    
    // 5. Create generation request
    const generation = await db.generation_requests.insertOne({
      request_id,
      correlation_id,
      user_id,
      project_id,
      request_type: payload.request_type,
      prompt: enhanced.text,
      text_refs: [{ kind: "prompt", value: enhanced.text, embedding_id: enhanced.embedding_id }],
      image_refs: validatedRefs.images,
      video_refs: validatedRefs.videos,
      audio_refs: validatedRefs.audios,
      requested_model: payload.model,
      requested_provider: payload.provider || inferProvider(payload.model),
      parameters: {
        duration: payload.duration,
        aspect_ratio: payload.aspect_ratio,
        resolution: payload.resolution,
        generate_audio: payload.generate_audio
      },
      status: "SUBMITTED",
      submitted_at: new Date(),
      retry_count: 0,
      max_retries: 3,
      tags: payload.tags || [],
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // 6. Enqueue to subsystem queue
    const target_subsystem = inferSubsystem(payload.request_type);
    await queue.enqueue({
      queue_message_id: uuidv4(),
      correlation_id,
      request_id,
      idempotency_key,
      type: "GENERATION_REQUEST",
      target_subsystem,
      payload,
      metadata: { user_id, project_id },
      retry_policy: { attempt: 1, max_attempts: 3, backoff_seconds: 10, backoff_multiplier: 2 },
      enqueued_at: new Date()
    });
    
    // 7. Emit event
    await eventBus.emit("generation.submitted", {
      request_id,
      correlation_id,
      user_id,
      project_id,
      model: payload.model,
      provider: payload.provider || inferProvider(payload.model)
    });
    
    // 8. Log audit
    await auditLog.log({
      correlation_id,
      user_id,
      project_id,
      event_type: "generation.submitted",
      resource_id: request_id,
      details: { model: payload.model, duration: payload.duration },
      success: true
    });
    
    // 9. Cache response for idempotency
    const response = {
      request_id,
      correlation_id,
      task_id: null,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      estimated_credits: estimateCredits(payload),
      poll_url: `/api/generation/${request_id}/status`,
      poll_interval_ms: 2000
    };
    
    await db.idempotency_keys.insertOne({
      idempotency_key,
      request_hash: hashRequest(payload),
      user_id,
      response_status: 200,
      response_body: response,
      first_received_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),  // 1-hour TTL
      version: 1
    });
    
    return res.status(202).json(response);  // 202 Accepted
  }
);
```

### Status Polling Endpoint

```typescript
/**
 * GET /api/generation/:request_id/status
 * Poll for generation status and result.
 */

app.get("/api/generation/:request_id/status",
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { request_id } = req.params;
    const user_id = req.user.user_id;
    const correlation_id = req.correlation_id;
    
    // 1. Fetch generation record
    const generation = await db.generation_requests.findOne({ request_id });
    
    if (!generation) {
      return res.status(404).json({ error: "Generation not found" });
    }
    
    // 2. Verify ownership
    if (generation.user_id !== user_id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    // 3. Poll provider if status is IN_PROGRESS
    if (generation.status === "IN_PROGRESS" && generation.task_id) {
      try {
        const providerStatus = await providerService.getTaskStatus(
          generation.task_id,
          generation.effective_provider || generation.requested_provider
        );
        
        // Update local state based on provider response
        if (providerStatus.status === "completed") {
          generation.status = "SUCCESS";
          generation.output_video_url = providerStatus.output_video_url;
          generation.completed_at = new Date();
          generation.consumed_credits = providerStatus.consumed_credits;
          
          await db.generation_requests.updateOne(
            { request_id },
            { $set: generation }
          );
          
          // Persist to Firebase
          await persistToFirebase(generation);
        } else if (providerStatus.status === "failed") {
          generation.status = "FAILED";
          generation.error_message = providerStatus.error;
          generation.completed_at = new Date();
          
          await db.generation_requests.updateOne(
            { request_id },
            { $set: generation }
          );
        }
      } catch (pollError) {
        console.error("[POLL ERROR]", pollError, { request_id, correlation_id });
        // Don't fail the status check; return last known state
      }
    }
    
    // 4. Return status response
    const response = {
      request_id,
      correlation_id,
      status: generation.status,
      
      // Result (if available)
      output_video_url: generation.output_video_url || null,
      firebase_video_url: generation.firebase_video_url || null,
      
      // Timing
      submitted_at: generation.submitted_at,
      started_at: generation.started_at,
      completed_at: generation.completed_at,
      estimated_time_remaining_sec: null,  // Placeholder
      
      // Model info
      requested_model: generation.requested_model,
      effective_model: generation.effective_model || generation.requested_model,
      fallback_applied: generation.fallback_applied,
      fallback_reason: generation.fallback_reason,
      
      // Cost
      estimated_credits: generation.estimated_credits,
      consumed_credits: generation.consumed_credits,
      
      // Error (if any)
      error_message: generation.error_message,
      error_code: generation.error_code,
      
      // Metadata
      output_dimensions: generation.output_dimensions,
      output_duration_sec: generation.output_duration_sec,
      
      // Next steps
      retry_url: generation.status === "FAILED" ? `/api/generation/${request_id}/retry` : null,
      download_url: generation.status === "SUCCESS" ? `/api/generation/${request_id}/download` : null
    };
    
    // 5. Log access
    await auditLog.log({
      correlation_id,
      user_id,
      event_type: "generation.status.checked",
      resource_id: request_id,
      details: { status: generation.status },
      success: true
    });
    
    return res.json(response);
  }
);
```

---

## Data Persistence and Recovery

### Tiered Persistence Strategy

```
┌──────────────────────────────────────────────────────┐
│  TIER 1: Hot Data (Active generations, last 7 days) │
│  Storage: MongoDB + Redis Cache                     │
│  Retention: 7 days                                  │
│  TTL: None (manual cleanup)                         │
├──────────────────────────────────────────────────────┤
│  TIER 2: Warm Data (Archived, 8-30 days)           │
│  Storage: MongoDB + Firebase Storage               │
│  Retention: 30 days                                │
│  TTL: Auto-delete after 30 days                    │
├──────────────────────────────────────────────────────┤
│  TIER 3: Cold Data (Reference library, 31+ days)   │
│  Storage: Firebase Storage + Archive Tier          │
│  Retention: 1 year                                 │
│  TTL: Auto-delete after 365 days                   │
├──────────────────────────────────────────────────────┤
│  TIER 4: Immutable (Audit trail, forever)         │
│  Storage: Cloud Audit Logs, Firestore Archive      │
│  Retention: Permanent (GDPR exemptions apply)       │
│  TTL: None (compliance hold)                        │
└──────────────────────────────────────────────────────┘
```

### MongoDB Retention & Cleanup Jobs

```typescript
// Job: Clean up transient generations older than 7 days
async function cleanupTransientGenerations() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const transient = await db.generation_requests.find({
    retention_policy: "transient",
    created_at: { $lt: sevenDaysAgo },
    deleted_at: null
  }).toArray();
  
  for (const gen of transient) {
    // 1. Delete associated media from Firebase
    if (gen.firebase_video_url) {
      await deleteFromFirebase(gen.storage_path);
    }
    
    // 2. Soft-delete MongoDB record
    await db.generation_requests.updateOne(
      { request_id: gen.request_id },
      { $set: { deleted_at: new Date() } }
    );
    
    // 3. Archive to cold storage
    await archiveToGlacier({
      request_id: gen.request_id,
      data: JSON.stringify(gen),
      archived_at: new Date()
    });
  }
}

// Schedule cleanup job
schedule.scheduleJob("0 2 * * *", cleanupTransientGenerations);  // Daily at 2 AM
```

### Data Recovery Strategy

#### Scenario 1: Generation Succeeded but Firebase Save Failed

```typescript
async function recoverPersistenceFailure(request_id: string) {
  const generation = await db.generation_requests.findOne({ request_id });
  
  if (generation.status === "SUCCESS" && !generation.firebase_video_url) {
    // Video generated but not yet persisted to Firebase
    const { firebaseUrl, thumbnailUrl } = await saveGeneratedVideoArtifactsToFirebase({
      sourceUrl: generation.output_video_url,
      storageBasePath: `toorgen-lab/recovered/${request_id}`,
      captureThumbnail: true
    });
    
    await db.generation_requests.updateOne(
      { request_id },
      { 
        firebase_video_url: firebaseUrl,
        thumbnail_url: thumbnailUrl,
        recovery_attempt_at: new Date()
      }
    );
  }
}

// Manual trigger or scheduled job
cron.schedule("*/5 * * * *", async () => {
  const pending = await db.generation_requests.find({
    status: "SUCCESS",
    firebase_video_url: null,
    created_at: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).toArray();
  
  for (const gen of pending) {
    await recoverPersistenceFailure(gen.request_id);
  }
});
```

#### Scenario 2: Generation In Progress but Queue Lost

```typescript
async function recoverLostQueueItem(request_id: string) {
  const generation = await db.generation_requests.findOne({ request_id });
  
  if (generation.status === "SUBMITTED" || generation.status === "IN_PROGRESS") {
    // Requeue the request
    const target_subsystem = inferSubsystem(generation.request_type);
    
    await queue.enqueue({
      queue_message_id: uuidv4(),
      correlation_id: generation.correlation_id,
      request_id,
      idempotency_key: `recovery_${request_id}`,
      type: "GENERATION_REQUEST",
      target_subsystem,
      payload: rebuildPayload(generation),
      metadata: { user_id: generation.user_id, project_id: generation.project_id },
      retry_policy: { 
        attempt: (generation.retry_count || 0) + 1, 
        max_attempts: 3, 
        backoff_seconds: 10, 
        backoff_multiplier: 2 
      },
      enqueued_at: new Date()
    });
    
    await auditLog.log({
      correlation_id: generation.correlation_id,
      event_type: "generation.recovered",
      resource_id: request_id,
      details: { reason: "queue_loss_recovery" }
    });
  }
}

// Monitor for stalled tasks (in queue for >5 minutes without update)
async function monitorStalledTasks() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const stalled = await db.generation_requests.find({
    status: { $in: ["SUBMITTED", "IN_PROGRESS"] },
    updated_at: { $lt: fiveMinutesAgo }
  }).toArray();
  
  for (const gen of stalled) {
    await recoverLostQueueItem(gen.request_id);
  }
}

cron.schedule("* * * * *", monitorStalledTasks);  // Every minute
```

---

## Text Prompt Vectorization

### Embedding Pipeline

```
┌───────────────────┐
│  User Prompt      │
│  "A dog..."       │
└────────┬──────────┘
         ↓
    ┌─────────────────────────────────────┐
    │ Prompt Enhancement (Optional)       │
    │ - Expand description                │
    │ - Add style/quality keywords        │
    │ - Policy compliance check           │
    └────────┬────────────────────────────┘
             ↓
    ┌──────────────────────────────────┐
    │ Tokenization & Normalization     │
    │ - Lowercase, trim whitespace     │
    │ - Remove special chars           │
    │ - Language detection             │
    └────────┬─────────────────────────┘
             ↓
    ┌──────────────────────────────────┐
    │ Embedding Generation             │
    │ - Model: text-embedding-3-small  │
    │ - Dimensions: 1536               │
    │ - Batch processing               │
    └────────┬─────────────────────────┘
             ↓
    ┌──────────────────────────────────┐
    │ Vector Storage (MongoDB)         │
    │ - Index for similarity search    │
    │ - Cache recent embeddings        │
    └────────┬─────────────────────────┘
             ↓
    ┌──────────────────────────────────┐
    │ Usage: Recommendation & Duping   │
    │ - Find similar past prompts      │
    │ - Detect near-duplicates         │
    │ - Suggest variations             │
    └──────────────────────────────────┘
```

### Implementation

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function vectorizePrompt(prompt: string): Promise<{
  prompt: string;
  embedding_id: string;
  vector: number[];
  dimensions: number;
  generated_at: Date;
}> {
  // 1. Enhance prompt (optional)
  const enhanced = await enhancePrompt(prompt);
  
  // 2. Generate embedding
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: enhanced,
    encoding_format: "float"
  });
  
  const embedding = response.data[0];
  const embedding_id = uuidv4();
  
  // 3. Store in MongoDB
  await db.text_prompts.insertOne({
    _id: ObjectId(),
    prompt_id: embedding_id,
    original_text: prompt,
    enhanced_text: enhanced,
    embeddings: {
      model: "text-embedding-3-small",
      dimensions: embedding.embedding.length,
      vector: embedding.embedding,
      generated_at: new Date()
    },
    created_at: new Date()
  });
  
  return {
    prompt: enhanced,
    embedding_id,
    vector: embedding.embedding,
    dimensions: embedding.embedding.length,
    generated_at: new Date()
  };
}

// Batch vectorization (e.g., for reference library)
async function batchVectorizePrompts(prompts: string[]): Promise<Map<string, number[]>> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: prompts,
    encoding_format: "float"
  });
  
  const map = new Map<string, number[]>();
  response.data.forEach((item, idx) => {
    map.set(prompts[idx], item.embedding);
  });
  
  return map;
}

// Similarity search (find similar past prompts)
async function findSimilarPrompts(query: string, limit = 5): Promise<Array<{
  prompt_id: string;
  original_text: string;
  similarity_score: number;
}>> {
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    encoding_format: "float"
  });
  
  const queryVector = queryEmbedding.data[0].embedding;
  
  // MongoDB vector search (requires Atlas Vector Search or other solution)
  const results = await db.text_prompts
    .aggregate([
      {
        $search: {
          cosmosSearch: {
            vector: queryVector,
            k: limit
          },
          returnStoredSource: true
        }
      },
      {
        $project: {
          prompt_id: 1,
          original_text: 1,
          similarityScore: { $meta: "searchScore" }
        }
      }
    ])
    .toArray();
  
  return results.map(r => ({
    prompt_id: r.prompt_id,
    original_text: r.original_text,
    similarity_score: r.similarityScore
  }));
}

// Detect near-duplicates
async function detectNearDuplicate(prompt: string, threshold = 0.95): Promise<{
  isDuplicate: boolean;
  existingPromptId?: string;
  similarity: number;
}> {
  const similar = await findSimilarPrompts(prompt, 1);
  
  if (similar.length > 0 && similar[0].similarity_score >= threshold) {
    return {
      isDuplicate: true,
      existingPromptId: similar[0].prompt_id,
      similarity: similar[0].similarity_score
    };
  }
  
  return {
    isDuplicate: false,
    similarity: 0
  };
}
```

---

## Deployment and Operational Strategies

### Kubernetes Deployment Manifest

```yaml
---
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: toorgen-prod

---
# Secrets (managed externally, e.g., HashiCorp Vault)
apiVersion: v1
kind: Secret
metadata:
  name: toorgen-secrets
  namespace: toorgen-prod
type: Opaque
data:
  jwt-secret: <base64-encoded>
  encryption-key: <base64-encoded>
  api-key-openai: <base64-encoded>
  provider-credentials: <base64-encoded>

---
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: toorgen-config
  namespace: toorgen-prod
data:
  log-level: "info"
  mongo-uri: "mongodb://mongo-svc:27017/toorgen"
  redis-uri: "redis://redis-svc:6379"
  queue-type: "rabbitmq"
  rabbitmq-uri: "amqp://rabbitmq-svc:5672"

---
# MongoDB Service
apiVersion: v1
kind: Service
metadata:
  name: mongo-svc
  namespace: toorgen-prod
spec:
  selector:
    app: mongo
  ports:
    - port: 27017
      targetPort: 27017

---
# MongoDB Stateful Set
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
  namespace: toorgen-prod
spec:
  serviceName: mongo-svc
  replicas: 3
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:6.0
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: admin
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: toorgen-secrets
                  key: mongo-password
          volumeMounts:
            - name: mongo-storage
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: mongo-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi

---
# RabbitMQ Service
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-svc
  namespace: toorgen-prod
spec:
  selector:
    app: rabbitmq
  ports:
    - port: 5672
      targetPort: 5672
    - port: 15672
      targetPort: 15672

---
# RabbitMQ Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
  namespace: toorgen-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3.12-management
          ports:
            - containerPort: 5672
            - containerPort: 15672
          env:
            - name: RABBITMQ_DEFAULT_USER
              value: admin
            - name: RABBITMQ_DEFAULT_PASS
              valueFrom:
                secretKeyRef:
                  name: toorgen-secrets
                  key: rabbitmq-password

---
# Redis Service
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  namespace: toorgen-prod
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379

---
# Redis Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: toorgen-prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          command: ["redis-server"]
          args: ["--requirepass", "$(REDIS_PASSWORD)"]
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: toorgen-secrets
                  key: redis-password

---
# API Gateway Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: toorgen-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: toorgen/api-gateway:latest
          ports:
            - containerPort: 3000
          env:
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: toorgen-config
                  key: log-level
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: toorgen-secrets
                  key: jwt-secret
            - name: MONGO_URI
              valueFrom:
                configMapKeyRef:
                  name: toorgen-config
                  key: mongo-uri
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5

---
# API Gateway Service
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-svc
  namespace: toorgen-prod
spec:
  selector:
    app: api-gateway
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 3000

---
# Video Subsystem Worker Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-worker
  namespace: toorgen-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: video-worker
  template:
    metadata:
      labels:
        app: video-worker
    spec:
      containers:
        - name: worker
          image: toorgen/video-subsystem:latest
          env:
            - name: QUEUE_NAME
              value: "video"
            - name: RABBITMQ_URI
              valueFrom:
                configMapKeyRef:
                  name: toorgen-config
                  key: rabbitmq-uri
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: toorgen-secrets
                  key: encryption-key
          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          livenessProbe:
            exec:
              command: ["/app/health-check.sh"]
            initialDelaySeconds: 30
            periodSeconds: 30

---
# HorizontalPodAutoscaler for Video Workers
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: video-worker-hpa
  namespace: toorgen-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: video-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

---
# Ingress for API Gateway
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: toorgen-ingress
  namespace: toorgen-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
    - hosts:
        - toorgen-api.com
      secretName: toorgen-tls
  rules:
    - host: toorgen-api.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-gateway-svc
                port:
                  number: 80
```

### Monitoring & Alerting (Prometheus + Grafana)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: toorgen-prod
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      - job_name: 'toorgen-api'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - toorgen-prod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: api-gateway|video-worker|audio-worker|image-worker|text-worker

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
                - alertmanager:9093

    rule_files:
      - /etc/prometheus/rules.yml

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: toorgen-prod
data:
  rules.yml: |
    groups:
      - name: toorgen_alerts
        interval: 30s
        rules:
          # Alert: High error rate
          - alert: HighGenerationErrorRate
            expr: |
              (
                rate(generation_requests_failed_total[5m])
                /
                rate(generation_requests_total[5m])
              ) > 0.1
            for: 5m
            annotations:
              summary: "High generation error rate detected"
              description: "Error rate is {{ $value | humanizePercentage }} over last 5 minutes"

          # Alert: Queue backup
          - alert: QueueBackup
            expr: queue_depth_total > 1000
            for: 5m
            annotations:
              summary: "Queue depth exceeded 1000 messages"

          # Alert: Task timeout
          - alert: GenerationTimeout
            expr: generation_time_seconds > 600
            for: 5m
            annotations:
              summary: "Generation task exceeded 10 minutes"

          # Alert: High latency
          - alert: HighAPILatency
            expr: histogram_quantile(0.95, api_request_duration_seconds) > 5
            for: 5m
            annotations:
              summary: "API 95th percentile latency exceeded 5 seconds"

          # Alert: Database connection pool exhausted
          - alert: DBConnPoolExhausted
            expr: mongodb_connections_available < 5
            for: 2m
            annotations:
              summary: "MongoDB connection pool near exhaustion"

          # Alert: Disk space low
          - alert: DiskSpaceLow
            expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
            for: 5m
            annotations:
              summary: "Disk space below 10%"
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1–2)
1. **Database Layer**
   - [ ] Set up MongoDB cluster (3-node replica set)
   - [ ] Create collection schemas and indexes
   - [ ] Implement encryption at rest (CMEK)

2. **Queue System**
   - [ ] Deploy RabbitMQ cluster
   - [ ] Implement queue producer and consumer pattern
   - [ ] Add retry/backoff logic and DLQ

3. **Security Foundation**
   - [ ] Set up HashiCorp Vault for secrets
   - [ ] Implement JWT authentication middleware
   - [ ] Add SSRF protections to proxy endpoints

### Phase 2: Subsystem Development (Weeks 3–6)
1. **Text Subsystem**
   - [ ] Prompt validation & normalization
   - [ ] Integration with OpenAI embeddings
   - [ ] Vectorization storage in MongoDB

2. **Image Subsystem**
   - [ ] Upload handler with validation
   - [ ] Format normalization and metadata extraction
   - [ ] Signed URL generation

3. **Video Subsystem**
   - [ ] Upload handler and proxy implementation
   - [ ] Frame extraction and thumbnail generation
   - [ ] Duration/codec analysis

4. **Audio Subsystem**
   - [ ] Upload handler and format conversion
   - [ ] Waveform analysis
   - [ ] Metadata extraction

### Phase 3: API & Request System (Weeks 7–8)
1. **Generation Request Submission**
   - [ ] Idempotency key generation and dedup
   - [ ] Request validation chain
   - [ ] Rate limiting and quota enforcement

2. **Status Polling**
   - [ ] Implement polling endpoint
   - [ ] Provider integration layer
   - [ ] State reconciliation logic

3. **Data Persistence**
   - [ ] Firebase Storage integration
   - [ ] Tiered retention policies
   - [ ] TTL cleanup jobs

### Phase 4: Observability & Hardening (Weeks 9–10)
1. **Audit Logging**
   - [ ] Centralized structured logging
   - [ ] Correlation ID propagation
   - [ ] Compliance audit trails

2. **Monitoring**
   - [ ] Prometheus metrics export
   - [ ] Grafana dashboards
   - [ ] Alert rules

3. **Resilience**
   - [ ] Circuit breaker implementation
   - [ ] Health checks and liveness probes
   - [ ] Data recovery procedures

### Phase 5: Testing & Deployment (Weeks 11–12)
1. **Testing**
   - [ ] Unit tests for all subsystems
   - [ ] Integration tests
   - [ ] Load testing (1000+ req/sec)
   - [ ] Security penetration testing

2. **Deployment**
   - [ ] Kubernetes manifest finalization
   - [ ] Staging environment validation
   - [ ] Blue-green deployment strategy
   - [ ] Runbook documentation

---

## Conclusion

This refactored architecture provides:
- **Rock-solid reliability:** Queue-driven, event-based, with comprehensive retry/recovery logic.
- **Enterprise-grade security:** Encryption, RBAC, audit logging, SSRF protection.
- **Scalability:** Horizontal subsystem scaling, caching, efficient database queries.
- **Observability:** Structured logging, correlation IDs, comprehensive metrics.
- **Compliance:** Retention policies, right-to-delete, audit trails, secrets management.

The design follows industry standards for high-throughput video processing platforms and is production-ready upon completion of the implementation roadmap.

**End of Remediation & Architecture Guide**
