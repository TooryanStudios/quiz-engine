import { randomUUID } from "node:crypto";

const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_JOBS = 5000;

const nowIso = () => new Date().toISOString();

const normalizeLimit = (value, fallback = 20, min = 1, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
};

export const createInMemoryWorkflowJobStore = (options = {}) => {
  const retentionMs = Number(options.retentionMs) > 0 ? Number(options.retentionMs) : DEFAULT_RETENTION_MS;
  const maxJobs = Number(options.maxJobs) > 0 ? Number(options.maxJobs) : DEFAULT_MAX_JOBS;
  const jobs = new Map();

  const prune = () => {
    const cutoff = Date.now() - retentionMs;
    for (const [jobId, job] of jobs.entries()) {
      const updatedAtMs = Date.parse(job.updatedAt || "");
      if (Number.isFinite(updatedAtMs) && updatedAtMs < cutoff) {
        jobs.delete(jobId);
      }
    }

    if (jobs.size <= maxJobs) {
      return;
    }

    const sorted = Array.from(jobs.values()).sort((a, b) => {
      return Date.parse(a.updatedAt || "") - Date.parse(b.updatedAt || "");
    });

    while (jobs.size > maxJobs && sorted.length) {
      const oldest = sorted.shift();
      if (oldest) {
        jobs.delete(oldest.id);
      }
    }
  };

  const createJob = ({ ownerUid, payload }) => {
    prune();

    const timestamp = nowIso();
    const job = {
      id: randomUUID(),
      ownerUid,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      stages: [],
      payload,
      result: null,
      error: null,
    };

    jobs.set(job.id, job);
    return { ...job };
  };

  const getJob = (jobId) => {
    const existing = jobs.get(jobId);
    return existing ? { ...existing } : null;
  };

  const updateJob = (jobId, updates) => {
    const existing = jobs.get(jobId);
    if (!existing) {
      return null;
    }

    const patch = typeof updates === "function" ? updates({ ...existing }) : updates;
    const next = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };

    jobs.set(jobId, next);
    return { ...next };
  };

  const appendStage = (jobId, stagePatch) => {
    const existing = jobs.get(jobId);
    if (!existing) {
      return null;
    }

    const stage = {
      name: stagePatch?.name || "unknown-stage",
      status: stagePatch?.status || "completed",
      startedAt: stagePatch?.startedAt || nowIso(),
      finishedAt: stagePatch?.finishedAt || nowIso(),
      details: stagePatch?.details || {},
    };

    const next = {
      ...existing,
      stages: [...existing.stages, stage],
      updatedAt: nowIso(),
    };
    jobs.set(jobId, next);
    return { ...next };
  };

  const getJobForOwner = ({ jobId, ownerUid }) => {
    const existing = jobs.get(jobId);
    if (!existing || existing.ownerUid !== ownerUid) {
      return null;
    }
    return { ...existing };
  };

  const listJobsForOwner = ({ ownerUid, limit, cursorUpdatedBefore }) => {
    const safeLimit = normalizeLimit(limit);
    const cursor = typeof cursorUpdatedBefore === "string" ? cursorUpdatedBefore.trim() : "";

    return Array.from(jobs.values())
      .filter((job) => job.ownerUid === ownerUid)
      .filter((job) => !cursor || String(job.updatedAt || "") < cursor)
      .sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""))
      .slice(0, safeLimit)
      .map((job) => ({ ...job }));
  };

  const getHealthSnapshot = () => {
    const counts = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      canceled: 0,
      total: jobs.size,
    };

    for (const job of jobs.values()) {
      if (job.status in counts) {
        counts[job.status] += 1;
      }
    }

    return {
      retentionMs,
      maxJobs,
      counts,
      generatedAt: nowIso(),
    };
  };

  return {
    createJob,
    getJob,
    updateJob,
    appendStage,
    getJobForOwner,
    listJobsForOwner,
    getHealthSnapshot,
  };
};
