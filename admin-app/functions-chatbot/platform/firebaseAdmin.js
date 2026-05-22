import fs from "node:fs/promises";
import path from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";

const normalizeServiceAccount = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const next = { ...value };
  if (typeof next.private_key === "string" && next.private_key.includes("\\n")) {
    next.private_key = next.private_key.replace(/\\n/g, "\n");
  }
  return next;
};

const loadFirebaseServiceAccount = async () => {
  const inlineJson = (process.env.FIREBASE_ADMIN_KEY_JSON || "").trim();
  if (inlineJson) {
    try {
      return normalizeServiceAccount(JSON.parse(inlineJson));
    } catch {
      throw new Error("FIREBASE_ADMIN_KEY_JSON is not valid JSON.");
    }
  }

  const keyPath = (process.env.FIREBASE_ADMIN_KEY_PATH || "").trim();
  if (!keyPath) {
    return null;
  }

  try {
    const resolvedPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.resolve(process.cwd(), keyPath);
    const raw = await fs.readFile(resolvedPath, "utf8");
    return normalizeServiceAccount(JSON.parse(raw));
  } catch (error) {
    throw new Error(`Failed to read FIREBASE_ADMIN_KEY_PATH: ${error?.message || error}`);
  }
};

let firebaseAdminAppPromise = null;

export const ensurePlatformFirebaseAdminApp = async () => {
  if (firebaseAdminAppPromise) {
    return firebaseAdminAppPromise;
  }

  firebaseAdminAppPromise = (async () => {
    const existing = getApps()[0];
    if (existing) {
      return existing;
    }

    const serviceAccount = await loadFirebaseServiceAccount();
    if (serviceAccount) {
      return initializeApp({ credential: cert(serviceAccount) }, "platform-infra");
    }

    const canUseApplicationDefault = Boolean(
      (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim()
      || (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "").trim()
      || (process.env.K_SERVICE || "").trim()
      || (process.env.FUNCTION_TARGET || "").trim()
    );

    if (canUseApplicationDefault) {
      return initializeApp({ credential: applicationDefault() }, "platform-infra");
    }

    throw new Error(
      "Firebase admin credentials are not configured. Set FIREBASE_ADMIN_KEY_PATH, FIREBASE_ADMIN_KEY_JSON, or GOOGLE_APPLICATION_CREDENTIALS."
    );
  })().catch((error) => {
    firebaseAdminAppPromise = null;
    throw error;
  });

  return firebaseAdminAppPromise;
};
