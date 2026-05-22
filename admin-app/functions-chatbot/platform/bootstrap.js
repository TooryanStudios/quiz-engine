import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { createFirebaseAuthVerifier } from "./auth.js";
import { ensurePlatformFirebaseAdminApp } from "./firebaseAdmin.js";
import {
  createFirestoreUploadSessionStore,
  createFirestoreWorkflowJobStore,
} from "./firestoreStores.js";
import { createInMemoryWorkflowJobStore } from "./jobStore.js";
import { registerPlatformInfraRoutes } from "./routes.js";
import {
  createInMemoryUploadSessionStore,
  createPlatformUploadSessionService,
} from "./uploadSessions.js";
import { createPlatformRateLimitService } from "./rateLimits.js";
import { createPlatformWorkflowEngine } from "./workflowEngine.js";

const pickFirstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

let initialized = false;

export const initializePlatformInfrastructure = ({ app, getValidationWebhookSecret }) => {
  if (!app || initialized) {
    return;
  }

  const storeBackend = pickFirstNonEmptyString(process.env.PLATFORM_STORE_BACKEND, "firestore")
    .toLowerCase();

  const useFirestoreStore = storeBackend !== "memory";

  const platformJobStore = useFirestoreStore
    ? createFirestoreWorkflowJobStore({
      ensureFirebaseAdminApp: ensurePlatformFirebaseAdminApp,
      getFirestore,
      collectionName: pickFirstNonEmptyString(
        process.env.PLATFORM_WORKFLOW_JOBS_COLLECTION,
        "platform_workflow_jobs",
      ),
      healthSampleLimit: Number(process.env.PLATFORM_STORE_HEALTH_SAMPLE_LIMIT) || 500,
    })
    : createInMemoryWorkflowJobStore({
      retentionMs: Number(process.env.PLATFORM_WORKFLOW_JOB_RETENTION_MS) || 24 * 60 * 60 * 1000,
      maxJobs: Number(process.env.PLATFORM_WORKFLOW_MAX_JOBS) || 5000,
    });

  const platformWorkflowEngine = createPlatformWorkflowEngine({
    jobStore: platformJobStore,
  });

  const platformUploadSessionStore = useFirestoreStore
    ? createFirestoreUploadSessionStore({
      ensureFirebaseAdminApp: ensurePlatformFirebaseAdminApp,
      getFirestore,
      collectionName: pickFirstNonEmptyString(
        process.env.PLATFORM_UPLOAD_SESSIONS_COLLECTION,
        "platform_upload_sessions",
      ),
      healthSampleLimit: Number(process.env.PLATFORM_STORE_HEALTH_SAMPLE_LIMIT) || 500,
    })
    : createInMemoryUploadSessionStore({
      retentionMs: Number(process.env.PLATFORM_UPLOAD_SESSION_RETENTION_MS) || 24 * 60 * 60 * 1000,
      maxSessions: Number(process.env.PLATFORM_UPLOAD_SESSION_MAX_COUNT) || 10000,
    });

  const platformUploadsBucketName = pickFirstNonEmptyString(
    process.env.PLATFORM_UPLOADS_BUCKET,
    process.env.FIREBASE_STORAGE_BUCKET,
    process.env.VITE_FIREBASE_STORAGE_BUCKET,
  );

  if (!platformUploadsBucketName) {
    console.warn("Platform uploads bucket is not configured. Set PLATFORM_UPLOADS_BUCKET or FIREBASE_STORAGE_BUCKET.");
  }

  if (!useFirestoreStore) {
    console.warn("Platform store backend is set to memory. Data will be ephemeral.");
  }

  const platformUploadSessionService = createPlatformUploadSessionService({
    ensureFirebaseAdminApp: ensurePlatformFirebaseAdminApp,
    getStorage,
    uploadSessionStore: platformUploadSessionStore,
    workflowEngine: platformWorkflowEngine,
    bucketName: platformUploadsBucketName,
    signedUrlTtlSec: Number(process.env.PLATFORM_UPLOAD_SIGNED_URL_TTL_SEC) || 15 * 60,
  });

  const verifyPlatformRequestAuth = createFirebaseAuthVerifier({
    ensureFirebaseAdminApp: ensurePlatformFirebaseAdminApp,
    getAuth,
  });

  const platformRateLimitService = createPlatformRateLimitService({
    ensureFirebaseAdminApp: ensurePlatformFirebaseAdminApp,
    getFirestore,
    backend: pickFirstNonEmptyString(
      process.env.PLATFORM_RATE_LIMIT_BACKEND,
      useFirestoreStore ? "firestore" : "memory",
    ),
    collectionName: pickFirstNonEmptyString(
      process.env.PLATFORM_RATE_LIMIT_COLLECTION,
      "platform_rate_limit_counters",
    ),
    maxMemoryCounters: Number(process.env.PLATFORM_RATE_LIMIT_MEMORY_MAX_COUNTERS) || 50000,
  });

  registerPlatformInfraRoutes({
    app,
    workflowEngine: platformWorkflowEngine,
    uploadSessionService: platformUploadSessionService,
    verifyFirebaseAuth: verifyPlatformRequestAuth,
    getValidationWebhookSecret,
    platformRateLimitService,
  });

  initialized = true;
};
