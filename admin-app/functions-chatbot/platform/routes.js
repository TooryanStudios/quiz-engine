import { randomBytes } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { ensurePlatformFirebaseAdminApp } from "./firebaseAdmin.js";
import { getTaxonomySnapshot } from "./taxonomy.js";
import { generateEnhancedPrompt } from "./promptEnhancer.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const MAX_LIST_LIMIT = Math.max(
  1,
  Math.min(Number(process.env.PLATFORM_LIST_MAX_LIMIT) || 50, 200),
);

const parseLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(Math.floor(parsed), MAX_LIST_LIMIT));
};

const parseCursorIso = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const cursor = value.trim();
  const timestamp = Date.parse(cursor);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return cursor;
};

const getNextCursor = (items, limit) => {
  if (!Array.isArray(items) || items.length < limit) {
    return null;
  }

  const last = items[items.length - 1];
  const updatedAt = typeof last?.updatedAt === "string" ? last.updatedAt : "";
  return updatedAt || null;
};

const resolveClientIp = (req) => {
  const forwardedFor = typeof req?.headers?.["x-forwarded-for"] === "string"
    ? req.headers["x-forwarded-for"]
    : "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim() || "";
  const fallback = typeof req?.ip === "string"
    ? req.ip.trim()
    : String(req?.socket?.remoteAddress || "").trim();

  return (firstForwarded || fallback || "").replace(/^::ffff:/i, "").trim();
};

const logPlatformEvent = (event, payload = {}) => {
  console.log(JSON.stringify({
    event: "platform.telemetry",
    platform: {
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    },
  }));
};

const rejectFromRateLimitDecision = ({
  req,
  res,
  decision,
  endpoint,
  ownerUid,
  tenantId,
  projectId,
}) => {
  if (Number.isFinite(decision?.retryAfterSeconds) && decision.retryAfterSeconds > 0) {
    res.set("Retry-After", String(decision.retryAfterSeconds));
  }

  if (Number.isFinite(decision?.limit)) {
    res.set("X-RateLimit-Limit", String(decision.limit));
  }

  if (Number.isFinite(decision?.remaining)) {
    res.set("X-RateLimit-Remaining", String(Math.max(0, decision.remaining)));
  }

  if (typeof decision?.resetAt === "string" && decision.resetAt) {
    res.set("X-RateLimit-Reset", decision.resetAt);
  }

  logPlatformEvent("rate_limit_rejected", {
    increment: 1,
    endpoint: String(endpoint || "unknown"),
    ownerUid: String(ownerUid || ""),
    tenantId: String(tenantId || ""),
    projectId: String(projectId || ""),
    ipAddress: resolveClientIp(req),
    status: Number(decision?.status) || 429,
    code: String(decision?.code || "platform_rate_limited"),
    retryAfterSeconds: Number(decision?.retryAfterSeconds) || 1,
    limit: Number.isFinite(decision?.limit) ? decision.limit : null,
    remaining: Number.isFinite(decision?.remaining) ? Math.max(0, decision.remaining) : null,
  });

  return res.status(Number(decision?.status) || 429).json({
    error: decision?.error || "Rate limit exceeded.",
    code: decision?.code || "platform_rate_limited",
    retryAfterSeconds: Number(decision?.retryAfterSeconds) || 1,
    resetAt: decision?.resetAt || null,
    limit: Number.isFinite(decision?.limit) ? decision.limit : null,
    remaining: Number.isFinite(decision?.remaining) ? Math.max(0, decision.remaining) : null,
  });
};

const parseCsvAllowlist = (value) => {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const extractBearerToken = (authorizationHeader) => {
  const normalized = typeof authorizationHeader === "string" ? authorizationHeader.trim() : "";
  const bearerMatch = normalized.match(/^bearer\s+(.+)$/i);
  return (bearerMatch?.[1] || "").trim();
};

const resolveValidationWebhookSecret = (getValidationWebhookSecret) => {
  if (typeof getValidationWebhookSecret === "function") {
    try {
      const managedSecret = String(getValidationWebhookSecret() || "").trim();
      if (managedSecret) {
        return managedSecret;
      }
    } catch {
      // Fall back to env-based local development value.
    }
  }

  return String(process.env.PLATFORM_VALIDATION_WEBHOOK_SECRET || "").trim();
};

const verifyValidationWebhookSecret = (req, { getValidationWebhookSecret } = {}) => {
  const expectedSecret = resolveValidationWebhookSecret(getValidationWebhookSecret);
  if (!expectedSecret) {
    return {
      ok: false,
      status: 503,
      error: "Validation webhook secret is not configured.",
    };
  }

  const headerSecret = typeof req.headers?.["x-platform-validation-secret"] === "string"
    ? req.headers["x-platform-validation-secret"].trim()
    : "";
  const bearerSecret = extractBearerToken(req.headers?.authorization);
  const providedSecret = headerSecret || bearerSecret;

  if (!providedSecret || providedSecret !== expectedSecret) {
    return {
      ok: false,
      status: 401,
      error: "Invalid validation webhook secret.",
    };
  }

  return { ok: true };
};

const sanitizeJobForResponse = (job) => {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    stages: job.stages,
    result: job.result,
    error: job.error,
    payload: job.payload,
  };
};

const normalizeStorageBucketName = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.replace(/^gs:\/\//i, "").replace(/\/$/, "");
};

const getLabStorageBucketName = (requestFirebaseConfig) => {
  const requestBucket = normalizeStorageBucketName(requestFirebaseConfig?.storageBucket);
  if (requestBucket) return requestBucket;

  return normalizeStorageBucketName(
    process.env.PLATFORM_UPLOADS_BUCKET
      || process.env.FIREBASE_STORAGE_BUCKET
      || process.env.STORAGE_BUCKET
      || "",
  );
};

const resolveLabSourceUrl = (req, rawUrl) => {
  const normalized = String(rawUrl || "").trim();
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${req.protocol}://${req.get("host")}${normalized}`;
  }

  return "";
};

const normalizeSignedUrlTtlSec = (value, fallbackSec = 15 * 60) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackSec;
  }

  return Math.max(60, Math.min(Math.floor(parsed), 7 * 24 * 60 * 60));
};

const inferFileExtension = (mimeType, fallback = "bin") => {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("avif")) return "avif";
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  return fallback;
};

const buildLabObjectPath = ({ storagePathPrefix, kind, projectId, folderId, mimeType }) => {
  const normalizedPrefix = String(storagePathPrefix || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const normalizedKind = ["image", "video", "audio"].includes(String(kind || "").trim())
    ? String(kind || "").trim()
    : "asset";

  const ext = inferFileExtension(mimeType, normalizedKind === "video" ? "mp4" : normalizedKind === "audio" ? "mp3" : "jpg");
  const fileName = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  const segments = [
    normalizedPrefix || "lab-references",
    normalizedKind,
    String(projectId || "").trim() || null,
    String(folderId || "").trim() || null,
    fileName,
  ].filter(Boolean);

  return segments.join("/");
};

const parseFirebaseObjectReference = (sourceUrl) => {
  const normalized = String(sourceUrl || "").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("gs://")) {
    const withoutPrefix = normalized.slice(5);
    const slashIndex = withoutPrefix.indexOf("/");
    if (slashIndex < 0) return null;
    const bucket = normalizeStorageBucketName(withoutPrefix.slice(0, slashIndex));
    const objectPath = withoutPrefix.slice(slashIndex + 1);
    if (!bucket || !objectPath) return null;
    return { bucket, objectPath };
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === "firebasestorage.googleapis.com" && parsed.pathname.startsWith("/v0/b/")) {
      const segments = parsed.pathname.split("/");
      const bucket = normalizeStorageBucketName(segments[3] || "");
      const objectIndex = segments.indexOf("o");
      const encodedObject = objectIndex >= 0 ? segments.slice(objectIndex + 1).join("/") : "";
      const objectPath = decodeURIComponent(encodedObject || "");
      if (!bucket || !objectPath) return null;
      return { bucket, objectPath };
    }

    if (hostname === "storage.googleapis.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const bucket = normalizeStorageBucketName(segments[0] || "");
      const objectPath = segments.slice(1).join("/");
      if (!bucket || !objectPath) return null;
      return { bucket, objectPath: decodeURIComponent(objectPath) };
    }

    if (hostname.endsWith(".storage.googleapis.com")) {
      const bucket = normalizeStorageBucketName(hostname.replace(/\.storage\.googleapis\.com$/i, ""));
      const objectPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      if (!bucket || !objectPath) return null;
      return { bucket, objectPath };
    }

    if (hostname.endsWith(".firebasestorage.app")) {
      const bucket = normalizeStorageBucketName(hostname);
      const objectPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      if (!bucket || !objectPath) return null;
      return { bucket, objectPath };
    }
  } catch {
    return null;
  }

  return null;
};

const createSignedReadUrl = async ({ bucket, objectPath, signedUrlTtlSec }) => {
  const adminApp = await ensurePlatformFirebaseAdminApp();
  const storage = getStorage(adminApp);
  const bucketHandle = bucket ? storage.bucket(bucket) : storage.bucket();
  const file = bucketHandle.file(objectPath);
  const expiresAt = Date.now() + (normalizeSignedUrlTtlSec(signedUrlTtlSec) * 1000);
  const [accessUrl] = await file.getSignedUrl({
    action: "read",
    version: "v4",
    expires: expiresAt,
  });

  return {
    accessUrl,
    expiresAt,
  };
};

export const registerPlatformInfraRoutes = ({
  app,
  workflowEngine,
  uploadSessionService,
  verifyFirebaseAuth,
  getValidationWebhookSecret,
  platformRateLimitService,
}) => {
  if (!app) {
    throw new Error("app is required.");
  }

  if (!workflowEngine) {
    throw new Error("workflowEngine is required.");
  }

  if (!uploadSessionService) {
    throw new Error("uploadSessionService is required.");
  }

  if (typeof verifyFirebaseAuth !== "function") {
    throw new Error("verifyFirebaseAuth is required.");
  }

  const rateLimitHealthAllowUids = new Set(
    parseCsvAllowlist(process.env.PLATFORM_RATE_LIMIT_HEALTH_ALLOW_UIDS),
  );

  const isRateLimitHealthAllowed = (uid) => {
    if (!rateLimitHealthAllowUids.size) {
      return true;
    }
    return rateLimitHealthAllowUids.has(String(uid || "").trim());
  };

  app.get("/api/platform/taxonomy", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    return res.status(200).json({
      ok: true,
      taxonomy: getTaxonomySnapshot(),
    });
  });

  app.get("/api/platform/workflows/health", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    return res.status(200).json({
      ok: true,
      health: await workflowEngine.getHealthSnapshot(),
    });
  });

  app.get("/api/platform/uploads/health", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    return res.status(200).json({
      ok: true,
      health: await uploadSessionService.getHealthSnapshot(),
    });
  });

  app.get("/api/platform/rate-limits/health", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!isRateLimitHealthAllowed(auth.uid)) {
      return res.status(403).json({
        error: "Forbidden.",
      });
    }

    return res.status(200).json({
      ok: true,
      health: platformRateLimitService
        ? platformRateLimitService.getHealthSnapshot()
        : {
          backend: "disabled",
          generatedAt: new Date().toISOString(),
        },
    });
  });

  app.post("/api/platform/uploads/validation-webhook", async (req, res) => {
    const webhookAuth = verifyValidationWebhookSecret(req, {
      getValidationWebhookSecret,
    });
    if (!webhookAuth.ok) {
      return res.status(webhookAuth.status).json({ error: webhookAuth.error });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const sessionId = String(body.sessionId || "").trim();
    const action = String(body.action || "").trim().toLowerCase();

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    try {
      let session = null;
      if (action === "upload-complete") {
        session = await uploadSessionService.markUploadCompletedInternal({
          sessionId,
          bytesUploaded: body.bytesUploaded,
        });
      } else if (action === "validation-result") {
        session = await uploadSessionService.submitValidationResultInternal({
          sessionId,
          validationStatus: body.validationStatus,
          validationReason: body.validationReason,
        });
      } else {
        return res.status(400).json({
          error: "action must be upload-complete or validation-result.",
        });
      }

      if (!session) {
        return res.status(404).json({ error: "Upload session not found." });
      }

      return res.status(200).json({
        ok: true,
        session,
      });
    } catch (error) {
      return res.status(400).json({
        error: error?.message || "Validation webhook processing failed.",
      });
    }
  });

  app.post("/api/platform/uploads/sessions", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const body = isPlainObject(req.body) ? req.body : {};

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeUploadSessionCreateLimit({
        ownerUid: auth.uid,
        projectId: body.projectId,
        ipAddress: resolveClientIp(req),
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "upload_create",
          ownerUid: auth.uid,
          tenantId: body.tenantId,
          projectId: body.projectId,
        });
      }
    }

    try {
      const session = await uploadSessionService.createUploadSession({
        ownerUid: auth.uid,
        payload: body,
      });

      return res.status(201).json({
        ok: true,
        session,
      });
    } catch (error) {
      return res.status(400).json({
        error: error?.message || "Failed to create upload session.",
      });
    }
  });

  app.post("/api/platform/uploads/sessions/:sessionId/complete", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const sessionId = String(req.params?.sessionId || "").trim();
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const body = isPlainObject(req.body) ? req.body : {};

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeUploadSessionMutationLimit({
        ownerUid: auth.uid,
        ipAddress: resolveClientIp(req),
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "upload_mutate_complete",
          ownerUid: auth.uid,
        });
      }
    }

    try {
      const session = await uploadSessionService.markUploadCompleted({
        ownerUid: auth.uid,
        sessionId,
        bytesUploaded: body.bytesUploaded,
      });

      if (!session) {
        return res.status(404).json({ error: "Upload session not found." });
      }

      return res.status(200).json({
        ok: true,
        session,
      });
    } catch (error) {
      return res.status(400).json({
        error: error?.message || "Failed to mark upload as completed.",
      });
    }
  });

  app.post("/api/platform/uploads/sessions/:sessionId/validation-result", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const sessionId = String(req.params?.sessionId || "").trim();
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const body = isPlainObject(req.body) ? req.body : {};

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeUploadSessionMutationLimit({
        ownerUid: auth.uid,
        ipAddress: resolveClientIp(req),
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "upload_mutate_validation_result",
          ownerUid: auth.uid,
        });
      }
    }

    try {
      const session = await uploadSessionService.submitValidationResult({
        ownerUid: auth.uid,
        sessionId,
        validationStatus: body.validationStatus,
        validationReason: body.validationReason,
      });

      if (!session) {
        return res.status(404).json({ error: "Upload session not found." });
      }

      return res.status(200).json({
        ok: true,
        session,
      });
    } catch (error) {
      return res.status(400).json({
        error: error?.message || "Failed to submit validation result.",
      });
    }
  });

  app.get("/api/platform/uploads/sessions/:sessionId", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeUploadSessionReadLimit({
        ownerUid: auth.uid,
        ipAddress: resolveClientIp(req),
        endpoint: "upload_get",
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "upload_get",
          ownerUid: auth.uid,
        });
      }
    }

    const sessionId = String(req.params?.sessionId || "").trim();
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const session = await uploadSessionService.getUploadSession({
      ownerUid: auth.uid,
      sessionId,
    });

    if (!session) {
      return res.status(404).json({ error: "Upload session not found." });
    }

    return res.status(200).json({
      ok: true,
      session,
    });
  });

  app.get("/api/platform/uploads/sessions", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeUploadSessionReadLimit({
        ownerUid: auth.uid,
        ipAddress: resolveClientIp(req),
        endpoint: "upload_list",
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "upload_list",
          ownerUid: auth.uid,
        });
      }
    }

    const limit = parseLimit(req.query?.limit);
    const cursorUpdatedBefore = parseCursorIso(req.query?.cursor);
    if (req.query?.cursor && !cursorUpdatedBefore) {
      return res.status(400).json({ error: "cursor must be a valid ISO timestamp." });
    }

    const sessions = await uploadSessionService.listUploadSessions({
      ownerUid: auth.uid,
      limit,
      cursorUpdatedBefore,
    });

    return res.status(200).json({
      ok: true,
      sessions,
      pagination: {
        limit,
        cursor: cursorUpdatedBefore || null,
        nextCursor: getNextCursor(sessions, limit),
      },
    });
  });

  app.post("/api/platform/workflows/jobs", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeWorkflowSubmissionLimit({
        ownerUid: auth.uid,
        projectId: body.projectId,
        ipAddress: resolveClientIp(req),
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "workflow_submit",
          ownerUid: auth.uid,
          tenantId: body.tenantId,
          projectId: body.projectId,
        });
      }
    }

    const created = await workflowEngine.submitJob({
      ownerUid: auth.uid,
      payload: body,
    });

    return res.status(202).json({
      ok: true,
      job: sanitizeJobForResponse(created),
    });
  });

  app.get("/api/platform/workflows/jobs/:jobId", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeWorkflowReadLimit({
        ownerUid: auth.uid,
        ipAddress: resolveClientIp(req),
        endpoint: "workflow_get",
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "workflow_get",
          ownerUid: auth.uid,
        });
      }
    }

    const jobId = String(req.params?.jobId || "").trim();
    if (!jobId) {
      return res.status(400).json({ error: "jobId is required." });
    }

    const job = await workflowEngine.getJobForOwner({
      ownerUid: auth.uid,
      jobId,
    });

    if (!job) {
      return res.status(404).json({ error: "Workflow job not found." });
    }

    return res.status(200).json({
      ok: true,
      job: sanitizeJobForResponse(job),
    });
  });

  app.get("/api/platform/workflows/jobs", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (platformRateLimitService) {
      const decision = await platformRateLimitService.consumeWorkflowReadLimit({
        ownerUid: auth.uid,
        ipAddress: resolveClientIp(req),
        endpoint: "workflow_list",
      });

      if (!decision.ok) {
        return rejectFromRateLimitDecision({
          req,
          res,
          decision,
          endpoint: "workflow_list",
          ownerUid: auth.uid,
        });
      }
    }

    const limit = parseLimit(req.query?.limit);
    const cursorUpdatedBefore = parseCursorIso(req.query?.cursor);
    if (req.query?.cursor && !cursorUpdatedBefore) {
      return res.status(400).json({ error: "cursor must be a valid ISO timestamp." });
    }

    const jobs = (await workflowEngine.listJobsForOwner({
      ownerUid: auth.uid,
      limit,
      cursorUpdatedBefore,
    }))
      .map(sanitizeJobForResponse);

    return res.status(200).json({
      ok: true,
      jobs,
      pagination: {
        limit,
        cursor: cursorUpdatedBefore || null,
        nextCursor: getNextCursor(jobs, limit),
      },
    });
  });

  app.post("/api/platform/features/prompt-enhancer", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const result = generateEnhancedPrompt(body);

    return res.status(200).json({
      ok: true,
      ...result,
    });
  });

  app.post("/api/lab/references/upload-by-url", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const sourceUrl = resolveLabSourceUrl(req, req.body?.url);
    const kind = String(req.body?.kind || "asset").trim();
    const storagePathPrefix = String(req.body?.storagePathPrefix || "").trim();
    const projectId = String(req.body?.projectId || "").trim();
    const folderId = String(req.body?.folderId || "").trim();
    const requestedMimeType = String(req.body?.mimeType || "").trim();
    const accessMode = String(req.body?.accessMode || "private-signed").trim().toLowerCase();
    const signedUrlTtlSec = normalizeSignedUrlTtlSec(req.body?.signedUrlTtlSec, 15 * 60);
    const bucketName = getLabStorageBucketName(req.body?.firebaseConfig);

    if (!sourceUrl) {
      return res.status(400).json({ error: "url must be an absolute http(s) URL or an absolute local path." });
    }

    if (!/^https?:\/\//i.test(sourceUrl)) {
      return res.status(400).json({ error: "Only http(s) source URLs are supported." });
    }

    if (!bucketName) {
      return res.status(400).json({ error: "storageBucket is required. Configure firebaseConfig.storageBucket or PLATFORM_UPLOADS_BUCKET." });
    }

    try {
      const upstream = await fetch(sourceUrl, { method: "GET" });
      if (!upstream.ok) {
        return res.status(502).json({ error: `Failed to fetch source URL (${upstream.status}).` });
      }

      const contentType = requestedMimeType || upstream.headers.get("content-type") || "application/octet-stream";
      const objectPath = buildLabObjectPath({
        storagePathPrefix,
        kind,
        projectId,
        folderId,
        mimeType: contentType,
      });

      const data = Buffer.from(await upstream.arrayBuffer());
      if (!data.length) {
        return res.status(400).json({ error: "Fetched source URL is empty." });
      }

      const adminApp = await ensurePlatformFirebaseAdminApp();
      const storage = getStorage(adminApp);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(objectPath);

      await file.save(data, {
        resumable: false,
        contentType,
        metadata: {
          cacheControl: "private, max-age=0, no-store",
        },
      });

      let firebaseUrl = `gs://${bucketName}/${objectPath}`;
      let expiresAt = null;

      if (accessMode === "private-signed") {
        const signed = await createSignedReadUrl({
          bucket: bucketName,
          objectPath,
          signedUrlTtlSec,
        });
        firebaseUrl = signed.accessUrl;
        expiresAt = signed.expiresAt;
      }

      return res.status(200).json({
        ok: true,
        saved: {
          sourceUrl,
          objectPath,
          storageBucket: bucketName,
          firebaseUrl,
          expiresAt,
          accessMode,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error?.message || "Failed to save lab reference URL." });
    }
  });

  app.post("/api/lab/references/resolve-access-urls", async (req, res) => {
    const auth = await verifyFirebaseAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const urls = Array.isArray(req.body?.urls)
      ? req.body.urls.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const signedUrlTtlSec = normalizeSignedUrlTtlSec(req.body?.signedUrlTtlSec, 15 * 60);

    if (!urls.length) {
      return res.status(400).json({ error: "urls[] is required." });
    }

    try {
      const resolved = {};
      for (const sourceUrl of urls) {
        const parsed = parseFirebaseObjectReference(sourceUrl);
        if (!parsed) {
          continue;
        }

        const signed = await createSignedReadUrl({
          bucket: parsed.bucket,
          objectPath: parsed.objectPath,
          signedUrlTtlSec,
        });

        resolved[sourceUrl] = {
          sourceUrl,
          accessUrl: signed.accessUrl,
          expiresAt: signed.expiresAt,
          isRefreshed: true,
        };
      }

      return res.status(200).json({ ok: true, resolved });
    } catch (error) {
      return res.status(500).json({ error: error?.message || "Failed to resolve lab access URLs." });
    }
  });
};
