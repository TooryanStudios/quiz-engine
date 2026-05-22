import { getFirestore } from "firebase-admin/firestore";
import { ensurePlatformFirebaseAdminApp } from "./firebaseAdmin.js";

const nowIso = () => new Date().toISOString();

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

const parsePositiveNumber = (value, fallback, min = 1, max = 100000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
};

const getRetentionConfig = () => {
  return {
    enabled: String(process.env.PLATFORM_RETENTION_ENABLED || "true").trim().toLowerCase() !== "false",
    retentionDays: parsePositiveNumber(process.env.PLATFORM_RETENTION_DAYS, 30, 1, 3650),
    batchSize: parsePositiveNumber(process.env.PLATFORM_RETENTION_BATCH_SIZE, 200, 1, 500),
    maxDeletesPerRun: parsePositiveNumber(process.env.PLATFORM_RETENTION_MAX_DELETES_PER_RUN, 2000, 1, 20000),
    workflowCollection: pickFirstNonEmptyString(
      process.env.PLATFORM_WORKFLOW_JOBS_COLLECTION,
      "platform_workflow_jobs",
    ),
    workflowArchiveCollection: pickFirstNonEmptyString(
      process.env.PLATFORM_WORKFLOW_JOBS_ARCHIVE_COLLECTION,
      "platform_workflow_jobs_archive",
    ),
    uploadCollection: pickFirstNonEmptyString(
      process.env.PLATFORM_UPLOAD_SESSIONS_COLLECTION,
      "platform_upload_sessions",
    ),
    uploadArchiveCollection: pickFirstNonEmptyString(
      process.env.PLATFORM_UPLOAD_SESSIONS_ARCHIVE_COLLECTION,
      "platform_upload_sessions_archive",
    ),
  };
};

const cleanupCollection = async ({
  db,
  sourceCollection,
  archiveCollection,
  cutoffIso,
  batchSize,
  maxDeletes,
}) => {
  let archived = 0;
  let deleted = 0;
  let loops = 0;

  while (deleted < maxDeletes) {
    const remaining = maxDeletes - deleted;
    const currentBatchSize = Math.max(1, Math.min(batchSize, remaining));

    const snapshot = await db
      .collection(sourceCollection)
      .where("updatedAt", "<", cutoffIso)
      .orderBy("updatedAt", "asc")
      .limit(currentBatchSize)
      .get();

    if (snapshot.empty) {
      break;
    }

    const writeBatch = db.batch();
    const archivedAt = nowIso();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const archiveRef = db.collection(archiveCollection).doc(doc.id);
      writeBatch.set(archiveRef, {
        ...data,
        archivedAt,
        archivedFromCollection: sourceCollection,
      });
      writeBatch.delete(doc.ref);
      archived += 1;
      deleted += 1;
    }

    await writeBatch.commit();
    loops += 1;
  }

  return {
    sourceCollection,
    archiveCollection,
    archived,
    deleted,
    loops,
    cutoffIso,
  };
};

export const runPlatformRetentionCleanup = async () => {
  const config = getRetentionConfig();

  if (!config.enabled) {
    logPlatformEvent("retention.cleanup_skipped", {
      increment: 1,
      reason: "disabled",
    });
    return {
      ok: true,
      skipped: true,
      reason: "disabled",
      config,
      executedAt: nowIso(),
    };
  }

  const adminApp = await ensurePlatformFirebaseAdminApp();
  const db = getFirestore(adminApp);

  const cutoffEpochMs = Date.now() - (config.retentionDays * 24 * 60 * 60 * 1000);
  const cutoffIso = new Date(cutoffEpochMs).toISOString();
  const perCollectionMaxDeletes = Math.max(1, Math.floor(config.maxDeletesPerRun / 2));

  const workflowStats = await cleanupCollection({
    db,
    sourceCollection: config.workflowCollection,
    archiveCollection: config.workflowArchiveCollection,
    cutoffIso,
    batchSize: config.batchSize,
    maxDeletes: perCollectionMaxDeletes,
  });

  const uploadStats = await cleanupCollection({
    db,
    sourceCollection: config.uploadCollection,
    archiveCollection: config.uploadArchiveCollection,
    cutoffIso,
    batchSize: config.batchSize,
    maxDeletes: perCollectionMaxDeletes,
  });

  const result = {
    ok: true,
    skipped: false,
    executedAt: nowIso(),
    config,
    cutoffIso,
    collections: {
      workflow: workflowStats,
      uploads: uploadStats,
    },
    totalArchived: workflowStats.archived + uploadStats.archived,
    totalDeleted: workflowStats.deleted + uploadStats.deleted,
  };

  logPlatformEvent("retention.cleanup_completed", {
    increment: 1,
    workflowArchived: workflowStats.archived,
    workflowDeleted: workflowStats.deleted,
    uploadArchived: uploadStats.archived,
    uploadDeleted: uploadStats.deleted,
    totalArchived: result.totalArchived,
    totalDeleted: result.totalDeleted,
  });

  return result;
};
