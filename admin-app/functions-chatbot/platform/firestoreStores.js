import { randomUUID } from "node:crypto";

const nowIso = () => new Date().toISOString();

const normalizeLimit = (value, fallback = 20, min = 1, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
};

const asObject = (value) => (value && typeof value === "object" ? value : {});

const readData = (snapshot) => {
  if (!snapshot?.exists) {
    return null;
  }
  const data = snapshot.data();
  return asObject(data);
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

export const createFirestoreWorkflowJobStore = ({
  ensureFirebaseAdminApp,
  getFirestore,
  collectionName = "platform_workflow_jobs",
  healthSampleLimit = 500,
}) => {
  const resolveDb = createDbResolver({ ensureFirebaseAdminApp, getFirestore });

  const getCollection = async () => {
    const db = await resolveDb();
    return db.collection(collectionName);
  };

  const createJob = async ({ ownerUid, payload }) => {
    const id = randomUUID();
    const timestamp = nowIso();
    const doc = {
      id,
      ownerUid,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      stages: [],
      payload,
      result: null,
      error: null,
    };

    const collection = await getCollection();
    await collection.doc(id).set(doc);
    return doc;
  };

  const getJob = async (jobId) => {
    const collection = await getCollection();
    const snapshot = await collection.doc(jobId).get();
    return readData(snapshot);
  };

  const updateJob = async (jobId, updates) => {
    const collection = await getCollection();
    const docRef = collection.doc(jobId);

    const next = await docRef.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const existing = readData(snap);
      if (!existing) {
        return null;
      }

      const patch = typeof updates === "function" ? updates(existing) : updates;
      const merged = {
        ...existing,
        ...asObject(patch),
        updatedAt: nowIso(),
      };

      tx.set(docRef, merged, { merge: true });
      return merged;
    });

    return next;
  };

  const appendStage = async (jobId, stagePatch) => {
    const collection = await getCollection();
    const docRef = collection.doc(jobId);

    return docRef.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const existing = readData(snap);
      if (!existing) {
        return null;
      }

      const stage = {
        name: stagePatch?.name || "unknown-stage",
        status: stagePatch?.status || "completed",
        startedAt: stagePatch?.startedAt || nowIso(),
        finishedAt: stagePatch?.finishedAt || nowIso(),
        details: asObject(stagePatch?.details),
      };

      const stages = Array.isArray(existing.stages) ? existing.stages : [];
      const merged = {
        ...existing,
        stages: [...stages, stage],
        updatedAt: nowIso(),
      };

      tx.set(docRef, merged, { merge: true });
      return merged;
    });
  };

  const getJobForOwner = async ({ jobId, ownerUid }) => {
    const job = await getJob(jobId);
    if (!job || job.ownerUid !== ownerUid) {
      return null;
    }
    return job;
  };

  const listJobsForOwner = async ({ ownerUid, limit, cursorUpdatedBefore }) => {
    const collection = await getCollection();
    const safeLimit = normalizeLimit(limit);
    const cursor = typeof cursorUpdatedBefore === "string" ? cursorUpdatedBefore.trim() : "";

    let snapshot;
    try {
      let query = collection
        .where("ownerUid", "==", ownerUid)
        .orderBy("updatedAt", "desc")
        .limit(safeLimit);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      snapshot = await query.get();
    } catch {
      snapshot = await collection
        .where("ownerUid", "==", ownerUid)
        .limit(safeLimit)
        .get();
    }

    const results = snapshot.docs
      .map((doc) => asObject(doc.data()))
      .filter((row) => !cursor || String(row.updatedAt || "") < cursor);
    results.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return results;
  };

  const getHealthSnapshot = async () => {
    const collection = await getCollection();
    const snapshot = await collection.limit(Math.max(50, Number(healthSampleLimit) || 500)).get();

    const counts = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      canceled: 0,
      sampled: snapshot.size,
      totalKnown: snapshot.size,
    };

    for (const doc of snapshot.docs) {
      const row = asObject(doc.data());
      const status = String(row.status || "");
      if (status in counts) {
        counts[status] += 1;
      }
    }

    return {
      backend: "firestore",
      collectionName,
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

export const createFirestoreUploadSessionStore = ({
  ensureFirebaseAdminApp,
  getFirestore,
  collectionName = "platform_upload_sessions",
  healthSampleLimit = 500,
}) => {
  const resolveDb = createDbResolver({ ensureFirebaseAdminApp, getFirestore });

  const getCollection = async () => {
    const db = await resolveDb();
    return db.collection(collectionName);
  };

  const create = async (session) => {
    const collection = await getCollection();
    await collection.doc(session.id).set(session);
    return session;
  };

  const getRaw = async (id) => {
    const collection = await getCollection();
    const snapshot = await collection.doc(id).get();
    return readData(snapshot);
  };

  const getRawByOwner = async ({ ownerUid, id }) => {
    const collection = await getCollection();
    const snapshot = await collection.doc(id).get();
    const row = readData(snapshot);
    if (!row || row.ownerUid !== ownerUid) {
      return null;
    }
    return row;
  };

  const update = async (id, patch) => {
    const collection = await getCollection();
    const docRef = collection.doc(id);

    return docRef.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const existing = readData(snap);
      if (!existing) {
        return null;
      }

      const nextPatch = typeof patch === "function" ? patch(existing) : patch;
      const merged = {
        ...existing,
        ...asObject(nextPatch),
        updatedAt: nowIso(),
      };

      tx.set(docRef, merged, { merge: true });
      return merged;
    });
  };

  const getByOwner = async ({ ownerUid, id }) => {
    return getRawByOwner({ ownerUid, id });
  };

  const listByOwner = async ({ ownerUid, limit = 20, cursorUpdatedBefore }) => {
    const collection = await getCollection();
    const safeLimit = normalizeLimit(limit);
    const cursor = typeof cursorUpdatedBefore === "string" ? cursorUpdatedBefore.trim() : "";

    let snapshot;
    try {
      let query = collection
        .where("ownerUid", "==", ownerUid)
        .orderBy("updatedAt", "desc")
        .limit(safeLimit);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      snapshot = await query.get();
    } catch {
      snapshot = await collection
        .where("ownerUid", "==", ownerUid)
        .limit(safeLimit)
        .get();
    }

    const results = snapshot.docs
      .map((doc) => asObject(doc.data()))
      .filter((row) => !cursor || String(row.updatedAt || "") < cursor);
    results.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return results;
  };

  const getHealthSnapshot = async () => {
    const collection = await getCollection();
    const snapshot = await collection.limit(Math.max(50, Number(healthSampleLimit) || 500)).get();

    const counts = {
      pending_upload: 0,
      uploaded: 0,
      validating: 0,
      validated: 0,
      rejected: 0,
      sampled: snapshot.size,
      totalKnown: snapshot.size,
    };

    for (const doc of snapshot.docs) {
      const row = asObject(doc.data());
      const status = String(row.status || "");
      if (status in counts) {
        counts[status] += 1;
      }
    }

    return {
      backend: "firestore",
      collectionName,
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
