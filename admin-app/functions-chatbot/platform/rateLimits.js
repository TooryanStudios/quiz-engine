const DEFAULT_COUNTER_COLLECTION = "platform_rate_limit_counters";
const DEFAULT_MAX_MEMORY_COUNTERS = 50000;

const nowIso = () => new Date().toISOString();

const parseNonNegativeInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const sanitizeKeyPart = (value, fallback = "unknown") => {
  const normalized = String(value || "").trim().toLowerCase();
  const cleaned = normalized.replace(/[^a-z0-9_.-]/g, "_").slice(0, 120);
  return cleaned || fallback;
};

const toWindowStartEpochMs = ({ epochMs, windowSec }) => {
  const windowMs = Math.max(1, Number(windowSec) || 1) * 1000;
  return Math.floor(epochMs / windowMs) * windowMs;
};

const computeRetryAfterSeconds = ({ epochMs, windowStartEpochMs, windowSec }) => {
  const windowEndEpochMs = windowStartEpochMs + (windowSec * 1000);
  return Math.max(1, Math.ceil((windowEndEpochMs - epochMs) / 1000));
};

const createDecisionFromExceededSpec = ({ spec, epochMs }) => {
  const retryAfterSeconds = computeRetryAfterSeconds({
    epochMs,
    windowStartEpochMs: spec.windowStartEpochMs,
    windowSec: spec.windowSec,
  });

  const isQuotaWindow = spec.windowSec >= 24 * 60 * 60;
  const code = isQuotaWindow ? "platform_quota_exceeded" : "platform_rate_limited";

  return {
    ok: false,
    status: 429,
    code,
    error: isQuotaWindow
      ? `Quota exceeded for ${spec.label}.`
      : `Rate limit exceeded for ${spec.label}.`,
    limit: spec.limit,
    remaining: 0,
    retryAfterSeconds,
    resetAt: new Date(spec.windowStartEpochMs + (spec.windowSec * 1000)).toISOString(),
    key: spec.counterKey,
    windowSec: spec.windowSec,
    scopeType: spec.scopeType,
    scopeId: spec.scopeId,
  };
};

const createSuccessDecision = ({ minimumRemaining, specs, epochMs }) => {
  const earliestResetEpochMs = specs.reduce((lowest, spec) => {
    const resetEpochMs = spec.windowStartEpochMs + (spec.windowSec * 1000);
    if (!Number.isFinite(lowest) || resetEpochMs < lowest) {
      return resetEpochMs;
    }
    return lowest;
  }, NaN);

  return {
    ok: true,
    status: 200,
    remaining: Number.isFinite(minimumRemaining) ? Math.max(0, minimumRemaining) : null,
    limit: specs.length ? specs[0].limit : null,
    resetAt: Number.isFinite(earliestResetEpochMs)
      ? new Date(earliestResetEpochMs).toISOString()
      : new Date(epochMs).toISOString(),
  };
};

const createDbResolver = ({ ensureFirebaseAdminApp, getFirestore }) => {
  let dbPromise = null;

  return async () => {
    if (!dbPromise) {
      dbPromise = ensureFirebaseAdminApp().then((adminApp) => getFirestore(adminApp));
    }

    return dbPromise;
  };
};

const buildCounterSpec = ({ scopeType, scopeId, metricName, windowSec, limit, epochMs }) => {
  const safeScopeType = sanitizeKeyPart(scopeType, "scope");
  const safeScopeId = sanitizeKeyPart(scopeId, "unknown");
  const safeMetricName = sanitizeKeyPart(metricName, "metric");
  const safeWindowSec = Math.max(1, Number(windowSec) || 1);
  const windowStartEpochMs = toWindowStartEpochMs({ epochMs, windowSec: safeWindowSec });
  const windowKey = Math.floor(windowStartEpochMs / 1000);

  return {
    scopeType: safeScopeType,
    scopeId: safeScopeId,
    metricName: safeMetricName,
    label: `${safeScopeType}:${safeMetricName}`,
    windowSec: safeWindowSec,
    limit: Math.max(1, Number(limit) || 1),
    windowStartEpochMs,
    counterKey: ["v1", safeScopeType, safeScopeId, safeMetricName, String(safeWindowSec), String(windowKey)].join("_"),
  };
};

const buildClientIpAddress = (rawValue) => {
  const input = String(rawValue || "").trim();
  if (!input) {
    return "";
  }

  const first = input.split(",")[0]?.trim() || "";
  return first.replace(/^::ffff:/i, "").trim();
};

export const createPlatformRateLimitService = ({
  ensureFirebaseAdminApp,
  getFirestore,
  backend = "firestore",
  collectionName = DEFAULT_COUNTER_COLLECTION,
  maxMemoryCounters = DEFAULT_MAX_MEMORY_COUNTERS,
} = {}) => {
  const selectedBackend = String(backend || "firestore").trim().toLowerCase() === "memory"
    ? "memory"
    : "firestore";

  const limits = {
    submitUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_SUBMIT_PER_MINUTE_USER, 20),
    submitIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_SUBMIT_PER_MINUTE_IP, 60),
    submitUserPerDay: parseNonNegativeInt(process.env.PLATFORM_QUOTA_SUBMIT_PER_DAY_USER, 1000),
    submitProjectPerDay: parseNonNegativeInt(process.env.PLATFORM_QUOTA_SUBMIT_PER_DAY_PROJECT, 600),
    workflowGetUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_WORKFLOW_GET_PER_MINUTE_USER, 240),
    workflowGetIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_WORKFLOW_GET_PER_MINUTE_IP, 480),
    workflowListUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_WORKFLOW_LIST_PER_MINUTE_USER, 90),
    workflowListIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_WORKFLOW_LIST_PER_MINUTE_IP, 180),
    uploadCreateUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_CREATE_PER_MINUTE_USER, 80),
    uploadCreateIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_CREATE_PER_MINUTE_IP, 160),
    uploadCreateUserPerDay: parseNonNegativeInt(process.env.PLATFORM_QUOTA_UPLOAD_CREATE_PER_DAY_USER, 2000),
    uploadCreateProjectPerDay: parseNonNegativeInt(process.env.PLATFORM_QUOTA_UPLOAD_CREATE_PER_DAY_PROJECT, 1200),
    uploadMutateUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_MUTATE_PER_MINUTE_USER, 180),
    uploadMutateIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_MUTATE_PER_MINUTE_IP, 300),
    uploadGetUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_GET_PER_MINUTE_USER, 300),
    uploadGetIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_GET_PER_MINUTE_IP, 500),
    uploadListUserPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_LIST_PER_MINUTE_USER, 120),
    uploadListIpPerMinute: parseNonNegativeInt(process.env.PLATFORM_LIMIT_UPLOAD_LIST_PER_MINUTE_IP, 220),
  };

  const memoryCounters = new Map();
  const memoryCounterLimit = Math.max(1000, Number(maxMemoryCounters) || DEFAULT_MAX_MEMORY_COUNTERS);

  const resolveDb = selectedBackend === "firestore" && ensureFirebaseAdminApp && getFirestore
    ? createDbResolver({ ensureFirebaseAdminApp, getFirestore })
    : null;

  const pruneMemoryCounters = (epochMs) => {
    if (memoryCounters.size <= memoryCounterLimit) {
      return;
    }

    for (const [key, row] of memoryCounters.entries()) {
      const expiresAtEpochMs = Number(row?.windowStartEpochMs || 0) + (Number(row?.windowSec || 0) * 1000);
      if (expiresAtEpochMs <= epochMs) {
        memoryCounters.delete(key);
      }

      if (memoryCounters.size <= memoryCounterLimit) {
        break;
      }
    }
  };

  const consumeWithMemory = ({ specs, epochMs }) => {
    let minimumRemaining = Infinity;

    for (const spec of specs) {
      const existing = memoryCounters.get(spec.counterKey);
      const windowMatches = existing && Number(existing.windowStartEpochMs) === spec.windowStartEpochMs;
      const currentCount = windowMatches ? Number(existing.count || 0) : 0;

      if (currentCount >= spec.limit) {
        return createDecisionFromExceededSpec({ spec, epochMs });
      }

      const remaining = spec.limit - (currentCount + 1);
      minimumRemaining = Math.min(minimumRemaining, remaining);
    }

    for (const spec of specs) {
      const existing = memoryCounters.get(spec.counterKey);
      const windowMatches = existing && Number(existing.windowStartEpochMs) === spec.windowStartEpochMs;
      const currentCount = windowMatches ? Number(existing.count || 0) : 0;

      memoryCounters.set(spec.counterKey, {
        count: currentCount + 1,
        windowStartEpochMs: spec.windowStartEpochMs,
        windowSec: spec.windowSec,
        updatedAt: nowIso(),
      });
    }

    pruneMemoryCounters(epochMs);
    return createSuccessDecision({ minimumRemaining, specs, epochMs });
  };

  const consumeWithFirestore = async ({ specs, epochMs }) => {
    if (!resolveDb) {
      return consumeWithMemory({ specs, epochMs });
    }

    const db = await resolveDb();
    const countersCollection = db.collection(collectionName);

    return db.runTransaction(async (tx) => {
      const refs = specs.map((spec) => countersCollection.doc(spec.counterKey));
      const snapshots = [];

      for (const ref of refs) {
        snapshots.push(await tx.get(ref));
      }

      let minimumRemaining = Infinity;

      for (let index = 0; index < specs.length; index += 1) {
        const spec = specs[index];
        const snapshot = snapshots[index];
        const data = snapshot?.exists ? snapshot.data() : null;
        const count = Number(data?.count || 0);

        if (count >= spec.limit) {
          return createDecisionFromExceededSpec({ spec, epochMs });
        }

        const remaining = spec.limit - (count + 1);
        minimumRemaining = Math.min(minimumRemaining, remaining);
      }

      for (let index = 0; index < specs.length; index += 1) {
        const spec = specs[index];
        const snapshot = snapshots[index];
        const data = snapshot?.exists ? snapshot.data() : null;
        const count = Number(data?.count || 0);

        tx.set(snapshot.ref, {
          scopeType: spec.scopeType,
          scopeId: spec.scopeId,
          metricName: spec.metricName,
          windowSec: spec.windowSec,
          windowStartEpochMs: spec.windowStartEpochMs,
          count: count + 1,
          updatedAt: nowIso(),
          expiresAtEpochMs: spec.windowStartEpochMs + (spec.windowSec * 1000),
        }, { merge: true });
      }

      return createSuccessDecision({ minimumRemaining, specs, epochMs });
    });
  };

  const consumeLimits = async (specs) => {
    if (!Array.isArray(specs) || specs.length === 0) {
      return {
        ok: true,
        status: 200,
        remaining: null,
        limit: null,
        resetAt: nowIso(),
      };
    }

    const epochMs = Date.now();
    const normalized = specs
      .filter((spec) => Number(spec?.limit) > 0)
      .map((spec) => buildCounterSpec({
        scopeType: spec.scopeType,
        scopeId: spec.scopeId,
        metricName: spec.metricName,
        windowSec: spec.windowSec,
        limit: spec.limit,
        epochMs,
      }));

    if (!normalized.length) {
      return {
        ok: true,
        status: 200,
        remaining: null,
        limit: null,
        resetAt: nowIso(),
      };
    }

    if (selectedBackend === "memory") {
      return consumeWithMemory({ specs: normalized, epochMs });
    }

    return consumeWithFirestore({ specs: normalized, epochMs });
  };

  const consumeWorkflowSubmissionLimit = async ({ ownerUid, projectId, ipAddress }) => {
    const safeOwnerUid = sanitizeKeyPart(ownerUid, "anonymous");
    const safeProjectId = sanitizeKeyPart(projectId, "");
    const safeIp = sanitizeKeyPart(buildClientIpAddress(ipAddress), "");

    const specs = [];

    if (limits.submitUserPerMinute > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: "workflow_submit_per_minute",
        windowSec: 60,
        limit: limits.submitUserPerMinute,
      });
    }

    if (limits.submitIpPerMinute > 0 && safeIp) {
      specs.push({
        scopeType: "ip",
        scopeId: safeIp,
        metricName: "workflow_submit_per_minute",
        windowSec: 60,
        limit: limits.submitIpPerMinute,
      });
    }

    if (limits.submitUserPerDay > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: "workflow_submit_per_day",
        windowSec: 24 * 60 * 60,
        limit: limits.submitUserPerDay,
      });
    }

    if (limits.submitProjectPerDay > 0 && safeProjectId) {
      specs.push({
        scopeType: "project",
        scopeId: safeProjectId,
        metricName: "workflow_submit_per_day",
        windowSec: 24 * 60 * 60,
        limit: limits.submitProjectPerDay,
      });
    }

    return consumeLimits(specs);
  };

  const consumeWorkflowReadLimit = async ({ ownerUid, ipAddress, endpoint }) => {
    const safeOwnerUid = sanitizeKeyPart(ownerUid, "anonymous");
    const safeIp = sanitizeKeyPart(buildClientIpAddress(ipAddress), "");
    const endpointName = String(endpoint || "workflow_get").trim().toLowerCase();

    const isListEndpoint = endpointName === "workflow_list";
    const userLimit = isListEndpoint
      ? limits.workflowListUserPerMinute
      : limits.workflowGetUserPerMinute;
    const ipLimit = isListEndpoint
      ? limits.workflowListIpPerMinute
      : limits.workflowGetIpPerMinute;

    const metricSuffix = isListEndpoint ? "workflow_list_per_minute" : "workflow_get_per_minute";
    const specs = [];

    if (userLimit > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: metricSuffix,
        windowSec: 60,
        limit: userLimit,
      });
    }

    if (ipLimit > 0 && safeIp) {
      specs.push({
        scopeType: "ip",
        scopeId: safeIp,
        metricName: metricSuffix,
        windowSec: 60,
        limit: ipLimit,
      });
    }

    return consumeLimits(specs);
  };

  const consumeUploadSessionCreateLimit = async ({ ownerUid, projectId, ipAddress }) => {
    const safeOwnerUid = sanitizeKeyPart(ownerUid, "anonymous");
    const safeProjectId = sanitizeKeyPart(projectId, "");
    const safeIp = sanitizeKeyPart(buildClientIpAddress(ipAddress), "");

    const specs = [];

    if (limits.uploadCreateUserPerMinute > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: "upload_create_per_minute",
        windowSec: 60,
        limit: limits.uploadCreateUserPerMinute,
      });
    }

    if (limits.uploadCreateIpPerMinute > 0 && safeIp) {
      specs.push({
        scopeType: "ip",
        scopeId: safeIp,
        metricName: "upload_create_per_minute",
        windowSec: 60,
        limit: limits.uploadCreateIpPerMinute,
      });
    }

    if (limits.uploadCreateUserPerDay > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: "upload_create_per_day",
        windowSec: 24 * 60 * 60,
        limit: limits.uploadCreateUserPerDay,
      });
    }

    if (limits.uploadCreateProjectPerDay > 0 && safeProjectId) {
      specs.push({
        scopeType: "project",
        scopeId: safeProjectId,
        metricName: "upload_create_per_day",
        windowSec: 24 * 60 * 60,
        limit: limits.uploadCreateProjectPerDay,
      });
    }

    return consumeLimits(specs);
  };

  const consumeUploadSessionMutationLimit = async ({ ownerUid, ipAddress }) => {
    const safeOwnerUid = sanitizeKeyPart(ownerUid, "anonymous");
    const safeIp = sanitizeKeyPart(buildClientIpAddress(ipAddress), "");

    const specs = [];

    if (limits.uploadMutateUserPerMinute > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: "upload_mutate_per_minute",
        windowSec: 60,
        limit: limits.uploadMutateUserPerMinute,
      });
    }

    if (limits.uploadMutateIpPerMinute > 0 && safeIp) {
      specs.push({
        scopeType: "ip",
        scopeId: safeIp,
        metricName: "upload_mutate_per_minute",
        windowSec: 60,
        limit: limits.uploadMutateIpPerMinute,
      });
    }

    return consumeLimits(specs);
  };

  const consumeUploadSessionReadLimit = async ({ ownerUid, ipAddress, endpoint }) => {
    const safeOwnerUid = sanitizeKeyPart(ownerUid, "anonymous");
    const safeIp = sanitizeKeyPart(buildClientIpAddress(ipAddress), "");
    const endpointName = String(endpoint || "upload_get").trim().toLowerCase();

    const isListEndpoint = endpointName === "upload_list";
    const userLimit = isListEndpoint
      ? limits.uploadListUserPerMinute
      : limits.uploadGetUserPerMinute;
    const ipLimit = isListEndpoint
      ? limits.uploadListIpPerMinute
      : limits.uploadGetIpPerMinute;

    const metricSuffix = isListEndpoint ? "upload_list_per_minute" : "upload_get_per_minute";
    const specs = [];

    if (userLimit > 0) {
      specs.push({
        scopeType: "uid",
        scopeId: safeOwnerUid,
        metricName: metricSuffix,
        windowSec: 60,
        limit: userLimit,
      });
    }

    if (ipLimit > 0 && safeIp) {
      specs.push({
        scopeType: "ip",
        scopeId: safeIp,
        metricName: metricSuffix,
        windowSec: 60,
        limit: ipLimit,
      });
    }

    return consumeLimits(specs);
  };

  const getHealthSnapshot = () => {
    return {
      backend: resolveDb ? selectedBackend : "memory",
      collectionName: resolveDb ? collectionName : "",
      limits,
      memoryCounterSize: memoryCounters.size,
      generatedAt: nowIso(),
    };
  };

  return {
    consumeWorkflowSubmissionLimit,
    consumeWorkflowReadLimit,
    consumeUploadSessionCreateLimit,
    consumeUploadSessionMutationLimit,
    consumeUploadSessionReadLimit,
    getHealthSnapshot,
  };
};
