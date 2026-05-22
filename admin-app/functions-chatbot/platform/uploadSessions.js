import { randomUUID } from "node:crypto";

const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 10000;

const nowIso = () => new Date().toISOString();

const parseIsoToEpochMs = (value) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const logPlatformEvent = (event, payload = {}) => {
  console.log(JSON.stringify({
    event: "platform.telemetry",
    platform: {
      event,
      timestamp: nowIso(),
      ...payload,
    },
  }));
};

const pickFirstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const sanitizeSegment = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const sanitizePrefix = (value) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map(sanitizeSegment)
    .filter(Boolean)
    .join("/");
};

const inferExtFromMime = (mimeType) => {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("jpeg") || value.includes("jpg")) return "jpg";
  if (value.includes("png")) return "png";
  if (value.includes("webp")) return "webp";
  if (value.includes("gif")) return "gif";
  if (value.includes("avif")) return "avif";
  if (value.includes("mp4")) return "mp4";
  if (value.includes("webm")) return "webm";
  if (value.includes("quicktime")) return "mov";
  if (value.includes("mpeg")) return "mpeg";
  if (value.includes("mp3")) return "mp3";
  if (value.includes("wav")) return "wav";
  if (value.includes("pdf")) return "pdf";
  return "bin";
};

const normalizeValidationStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "safe" || normalized === "validated") return "safe";
  if (normalized === "rejected" || normalized === "unsafe") return "rejected";
  return "pending";
};

const normalizeUploadPayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const mimeType = pickFirstNonEmptyString(body.mimeType, body.contentType, "application/octet-stream");
  const originalFileName = pickFirstNonEmptyString(body.fileName, body.originalFileName, "upload");
  const nameStem = sanitizeSegment(originalFileName.replace(/\.[a-z0-9]{1,8}$/i, "")) || "upload";

  return {
    tenantId: pickFirstNonEmptyString(body.tenantId),
    workspaceId: pickFirstNonEmptyString(body.workspaceId),
    projectId: pickFirstNonEmptyString(body.projectId),
    goal: pickFirstNonEmptyString(body.goal),
    prompt: pickFirstNonEmptyString(body.prompt),
    requestedOutputType: pickFirstNonEmptyString(body.requestedOutputType, body.outputType),
    kind: pickFirstNonEmptyString(body.kind, "file").toLowerCase(),
    storagePathPrefix: sanitizePrefix(body.storagePathPrefix) || "platform-uploads",
    mimeType,
    byteSize: Number(body.byteSize) > 0 ? Number(body.byteSize) : 0,
    originalFileName,
    nameStem,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    inputs: Array.isArray(body.inputs) ? body.inputs : [],
    autoStartWorkflow: body.autoStartWorkflow !== false,
  };
};

const sanitizeSessionForResponse = (session) => {
  if (!session) return null;
  return {
    id: session.id,
    ownerUid: session.ownerUid,
    status: session.status,
    validationStatus: session.validationStatus,
    validationReason: session.validationReason,
    uploadUrlExpiresAt: session.uploadUrlExpiresAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    bucketName: session.bucketName,
    storagePath: session.storagePath,
    gsUri: session.gsUri,
    contentType: session.contentType,
    byteSize: session.byteSize,
    context: session.context,
    workflowJobId: session.workflowJobId,
    upload: session.upload,
  };
};

export const createInMemoryUploadSessionStore = (options = {}) => {
  const retentionMs = Number(options.retentionMs) > 0 ? Number(options.retentionMs) : DEFAULT_RETENTION_MS;
  const maxSessions = Number(options.maxSessions) > 0 ? Number(options.maxSessions) : DEFAULT_MAX_SESSIONS;
  const sessions = new Map();

  const prune = () => {
    const cutoff = Date.now() - retentionMs;
    for (const [sessionId, session] of sessions.entries()) {
      const updatedAtMs = Date.parse(session.updatedAt || "");
      if (Number.isFinite(updatedAtMs) && updatedAtMs < cutoff) {
        sessions.delete(sessionId);
      }
    }

    if (sessions.size <= maxSessions) {
      return;
    }

    const oldestFirst = Array.from(sessions.values()).sort((a, b) => {
      return Date.parse(a.updatedAt || "") - Date.parse(b.updatedAt || "");
    });

    while (sessions.size > maxSessions && oldestFirst.length) {
      const next = oldestFirst.shift();
      if (next) {
        sessions.delete(next.id);
      }
    }
  };

  const create = (session) => {
    prune();
    sessions.set(session.id, session);
    return sanitizeSessionForResponse(session);
  };

  const getRaw = (id) => {
    const existing = sessions.get(id);
    return existing || null;
  };

  const getRawByOwner = ({ ownerUid, id }) => {
    const existing = sessions.get(id);
    if (!existing || existing.ownerUid !== ownerUid) {
      return null;
    }
    return existing;
  };

  const update = (id, patch) => {
    const existing = sessions.get(id);
    if (!existing) {
      return null;
    }

    const nextPatch = typeof patch === "function" ? patch({ ...existing }) : patch;
    const next = {
      ...existing,
      ...nextPatch,
      updatedAt: nowIso(),
    };

    sessions.set(id, next);
    return sanitizeSessionForResponse(next);
  };

  const getByOwner = ({ ownerUid, id }) => {
    const existing = sessions.get(id);
    if (!existing || existing.ownerUid !== ownerUid) {
      return null;
    }
    return sanitizeSessionForResponse(existing);
  };

  const listByOwner = ({ ownerUid, limit = 20, cursorUpdatedBefore }) => {
    const safeLimit = Math.max(1, Math.min(Math.floor(Number(limit) || 20), 100));
    const cursor = typeof cursorUpdatedBefore === "string" ? cursorUpdatedBefore.trim() : "";
    return Array.from(sessions.values())
      .filter((session) => session.ownerUid === ownerUid)
      .filter((session) => !cursor || String(session.updatedAt || "") < cursor)
      .sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""))
      .slice(0, safeLimit)
      .map(sanitizeSessionForResponse);
  };

  const getHealthSnapshot = () => {
    const counts = {
      pending_upload: 0,
      uploaded: 0,
      validating: 0,
      validated: 0,
      rejected: 0,
      total: sessions.size,
    };

    for (const session of sessions.values()) {
      if (session.status in counts) {
        counts[session.status] += 1;
      }
    }

    return {
      retentionMs,
      maxSessions,
      counts,
      generatedAt: nowIso(),
    };
  };

  return {
    create,
    getRaw,
    getRawByOwner,
    update,
    getByOwner,
    listByOwner,
    getHealthSnapshot,
  };
};

export const createPlatformUploadSessionService = ({
  ensureFirebaseAdminApp,
  getStorage,
  uploadSessionStore,
  workflowEngine,
  bucketName,
  signedUrlTtlSec = 15 * 60,
}) => {
  if (typeof ensureFirebaseAdminApp !== "function") {
    throw new Error("ensureFirebaseAdminApp is required.");
  }
  if (typeof getStorage !== "function") {
    throw new Error("getStorage is required.");
  }
  if (!uploadSessionStore) {
    throw new Error("uploadSessionStore is required.");
  }
  if (!workflowEngine) {
    throw new Error("workflowEngine is required.");
  }

  const resolveSessionForWrite = async ({ ownerUid, sessionId, allowInternal }) => {
    if (allowInternal) {
      if (typeof uploadSessionStore.getRaw === "function") {
        return uploadSessionStore.getRaw(sessionId);
      }
      return null;
    }
    return uploadSessionStore.getRawByOwner({ ownerUid, id: sessionId });
  };

  const createUploadSession = async ({ ownerUid, payload }) => {
    if (!bucketName) {
      throw new Error("Upload bucket is not configured. Set PLATFORM_UPLOADS_BUCKET or FIREBASE_STORAGE_BUCKET.");
    }

    const normalized = normalizeUploadPayload(payload);

    if (!normalized.projectId) {
      throw new Error("projectId is required.");
    }
    if (!normalized.workspaceId) {
      throw new Error("workspaceId is required.");
    }
    if (!normalized.prompt && !normalized.goal) {
      throw new Error("prompt or goal is required.");
    }

    const ext = inferExtFromMime(normalized.mimeType);
    const sessionId = randomUUID();
    const fileName = `${Date.now()}-${normalized.nameStem}-${sessionId.slice(0, 8)}.${ext}`;
    const storagePath = `${normalized.storagePathPrefix}/${ownerUid}/${normalized.projectId}/${fileName}`;

    const adminApp = await ensureFirebaseAdminApp();
    const bucket = getStorage(adminApp).bucket(bucketName);
    const file = bucket.file(storagePath);

    const uploadUrlExpiresAtEpochMs = Date.now() + (Math.max(60, Number(signedUrlTtlSec) || 15 * 60) * 1000);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: uploadUrlExpiresAtEpochMs,
      contentType: normalized.mimeType,
    });

    const timestamp = nowIso();

    const created = await uploadSessionStore.create({
      id: sessionId,
      ownerUid,
      status: "pending_upload",
      validationStatus: "pending",
      validationReason: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      uploadUrlExpiresAt: new Date(uploadUrlExpiresAtEpochMs).toISOString(),
      bucketName,
      storagePath,
      gsUri: `gs://${bucketName}/${storagePath}`,
      contentType: normalized.mimeType,
      byteSize: normalized.byteSize,
      context: {
        tenantId: normalized.tenantId,
        workspaceId: normalized.workspaceId,
        projectId: normalized.projectId,
        goal: normalized.goal,
        prompt: normalized.prompt,
        requestedOutputType: normalized.requestedOutputType,
        metadata: normalized.metadata,
        kind: normalized.kind,
        inputs: normalized.inputs,
        autoStartWorkflow: normalized.autoStartWorkflow,
      },
      workflowJobId: "",
      upload: {
        method: "PUT",
        uploadUrl,
        requiredHeaders: {
          "Content-Type": normalized.mimeType,
        },
      },
    });

    logPlatformEvent("upload.session_created", {
      increment: 1,
      ownerUid,
      tenantId: normalized.tenantId || "unknown",
      workspaceId: normalized.workspaceId,
      projectId: normalized.projectId,
      sessionId,
      requestedOutputType: normalized.requestedOutputType || "",
      autoStartWorkflow: Boolean(normalized.autoStartWorkflow),
      byteSize: normalized.byteSize,
      contentType: normalized.mimeType,
    });

    return created;
  };

  const markUploadCompleted = async ({ ownerUid, sessionId, bytesUploaded, allowInternal = false }) => {
    const existing = await resolveSessionForWrite({
      ownerUid,
      sessionId,
      allowInternal,
    });
    if (!existing) {
      return null;
    }

    const adminApp = await ensureFirebaseAdminApp();
    const bucket = getStorage(adminApp).bucket(existing.bucketName);
    const file = bucket.file(existing.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("Uploaded object was not found in storage.");
    }

    const [metadata] = await file.getMetadata();
    const remoteByteSize = Number(metadata?.size || 0);

    const nextByteSize = Number(bytesUploaded) > 0 ? Number(bytesUploaded) : existing.byteSize;
    const resolvedByteSize = remoteByteSize > 0 ? remoteByteSize : nextByteSize;

    const updated = await uploadSessionStore.update(sessionId, {
      status: "uploaded",
      byteSize: resolvedByteSize,
      upload: {
        ...existing.upload,
        completedAt: nowIso(),
        objectExists: true,
        verifiedAt: nowIso(),
        etag: metadata?.etag || "",
        md5Hash: metadata?.md5Hash || "",
      },
    });

    logPlatformEvent("upload.upload_completed", {
      increment: 1,
      ownerUid: existing.ownerUid,
      tenantId: existing.context?.tenantId || "unknown",
      workspaceId: existing.context?.workspaceId || "",
      projectId: existing.context?.projectId || "",
      sessionId: existing.id,
      byteSize: resolvedByteSize,
    });

    return updated;
  };

  const submitValidationResult = async ({
    ownerUid,
    sessionId,
    validationStatus,
    validationReason,
    allowInternal = false,
  }) => {
    const existing = await resolveSessionForWrite({
      ownerUid,
      sessionId,
      allowInternal,
    });
    if (!existing) {
      return null;
    }

    if (existing.status === "pending_upload") {
      throw new Error("Upload must be completed before validation result submission.");
    }

    if (existing.status === "rejected") {
      throw new Error("Validation result cannot be updated after rejection.");
    }

    if (existing.status === "validated" && String(validationStatus || "").toLowerCase() !== "pending") {
      throw new Error("Validation result is already finalized for this session.");
    }

    const normalizedStatus = normalizeValidationStatus(validationStatus);
    const safeReason = pickFirstNonEmptyString(validationReason);

    if (normalizedStatus === "pending") {
      const pending = await uploadSessionStore.update(sessionId, {
        status: "validating",
        validationStatus: "pending",
        validationReason: safeReason,
      });

      logPlatformEvent("upload.validation_result", {
        increment: 1,
        ownerUid: existing.ownerUid,
        tenantId: existing.context?.tenantId || "unknown",
        workspaceId: existing.context?.workspaceId || "",
        projectId: existing.context?.projectId || "",
        sessionId: existing.id,
        validationStatus: "pending",
        validationLatencyMs: 0,
      });

      return pending;
    }

    if (normalizedStatus === "rejected") {
      const rejected = await uploadSessionStore.update(sessionId, {
        status: "rejected",
        validationStatus: "rejected",
        validationReason: safeReason || "Rejected by validation pipeline.",
      });

      const validationLatencyMs = Math.max(0, Date.now() - parseIsoToEpochMs(existing.createdAt));
      logPlatformEvent("upload.validation_result", {
        increment: 1,
        ownerUid: existing.ownerUid,
        tenantId: existing.context?.tenantId || "unknown",
        workspaceId: existing.context?.workspaceId || "",
        projectId: existing.context?.projectId || "",
        sessionId: existing.id,
        validationStatus: "rejected",
        validationLatencyMs,
      });

      return rejected;
    }

    let workflowJobId = existing.workflowJobId || "";
    if (existing.context.autoStartWorkflow) {
      const job = await workflowEngine.submitJob({
        ownerUid: existing.ownerUid,
        payload: {
          tenantId: existing.context.tenantId,
          workspaceId: existing.context.workspaceId,
          projectId: existing.context.projectId,
          goal: existing.context.goal,
          prompt: existing.context.prompt,
          requestedOutputType: existing.context.requestedOutputType,
          inputs: [
            ...existing.context.inputs,
            {
              type: existing.context.kind,
              mimeType: existing.contentType,
              gsUri: existing.gsUri,
              storageBucket: existing.bucketName,
              storagePath: existing.storagePath,
              uploadSessionId: existing.id,
            },
          ],
          metadata: {
            ...existing.context.metadata,
            uploadSessionId: existing.id,
            source: "platform-upload-session",
          },
        },
      });
      workflowJobId = job.id;
    }

    const validated = await uploadSessionStore.update(sessionId, {
      status: "validated",
      validationStatus: "safe",
      validationReason: safeReason,
      workflowJobId,
    });

    const validationLatencyMs = Math.max(0, Date.now() - parseIsoToEpochMs(existing.createdAt));
    logPlatformEvent("upload.validation_result", {
      increment: 1,
      ownerUid: existing.ownerUid,
      tenantId: existing.context?.tenantId || "unknown",
      workspaceId: existing.context?.workspaceId || "",
      projectId: existing.context?.projectId || "",
      sessionId: existing.id,
      validationStatus: "safe",
      validationLatencyMs,
      workflowJobId,
    });

    return validated;
  };

  return {
    createUploadSession,
    markUploadCompleted,
    submitValidationResult,
    markUploadCompletedInternal: async ({ sessionId, bytesUploaded }) =>
      markUploadCompleted({
        ownerUid: "",
        sessionId,
        bytesUploaded,
        allowInternal: true,
      }),
    submitValidationResultInternal: async ({ sessionId, validationStatus, validationReason }) =>
      submitValidationResult({
        ownerUid: "",
        sessionId,
        validationStatus,
        validationReason,
        allowInternal: true,
      }),
    getUploadSession: async ({ ownerUid, sessionId }) =>
      uploadSessionStore.getByOwner({ ownerUid, id: sessionId }),
    listUploadSessions: async ({ ownerUid, limit, cursorUpdatedBefore }) =>
      uploadSessionStore.listByOwner({ ownerUid, limit, cursorUpdatedBefore }),
    getHealthSnapshot: async () => uploadSessionStore.getHealthSnapshot(),
  };
};
