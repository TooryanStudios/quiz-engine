import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const requestTimeoutMs = Math.max(1000, Number(process.env.SEEDANCE_SMOKE_REQUEST_TIMEOUT_MS || 45000));

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  }

  return values;
};

const ensure = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

const parseJsonSafe = (text) => {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const parseCsv = (value) => String(value || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const requestRaw = async (url, { method = "GET", headers = {}, body } = {}) => {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  const text = await response.text();
  const json = parseJsonSafe(text);

  return {
    status: response.status,
    text,
    json,
  };
};

const toAbsolutePath = (repoRootPath, rawPath) => {
  if (!rawPath) {
    return "";
  }

  return path.isAbsolute(rawPath)
    ? rawPath
    : path.join(repoRootPath, rawPath);
};

const createIdToken = async ({ serviceAccountPath, webApiKey }) => {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  const app = getApps()[0] || initializeApp(
    {
      credential: cert(serviceAccount),
    },
    `seedance-smoke-${Date.now()}`,
  );

  const uid = `seedance-smoke-${Date.now()}`;
  const customToken = await getAuth(app).createCustomToken(uid);

  const signIn = await requestRaw(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(webApiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    },
  );

  const idToken = signIn.json?.idToken;
  if (!idToken) {
    throw new Error(`Failed to obtain Firebase idToken (HTTP ${signIn.status}).`);
  }

  return {
    uid,
    idToken,
  };
};

const pickTaskId = (payload) => payload?.data?.id || payload?.task_id || payload?.id || "";

const resolveTargetUrls = () => {
  const explicitUrls = parseCsv(process.env.SEEDANCE_SMOKE_URLS);
  if (explicitUrls.length > 0) {
    return Array.from(new Set(explicitUrls.map((url) => url.replace(/\/+$/, ""))));
  }

  const productionUrl = (
    process.env.PLATFORM_BASE_URL
    || process.env.CHATBOT_FUNCTION_URL
    || "https://chatbot-blux3lwhuq-uc.a.run.app"
  ).trim();

  const stagingUrl = (
    process.env.PLATFORM_STAGING_BASE_URL
    || process.env.STAGING_CHATBOT_FUNCTION_URL
    || process.env.CHATBOT_STAGING_FUNCTION_URL
    || ""
  ).trim();

  return Array.from(new Set([productionUrl, stagingUrl]
    .map((url) => url.replace(/\/+$/, ""))
    .filter(Boolean)));
};

const runSeedanceSmokeForUrl = async ({ baseUrl, idToken, model, promptPrefix }) => {
  const prompt = `${promptPrefix} ${new Date().toISOString()}`;

  const unauthGenerate = await requestRaw(`${baseUrl}/api/seedance/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      duration: 5,
      aspect_ratio: "16:9",
      model,
    }),
  });

  const authGenerate = await requestRaw(`${baseUrl}/api/seedance/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      duration: 5,
      aspect_ratio: "16:9",
      model,
    }),
  });

  const taskId = pickTaskId(authGenerate.json);
  let authStatus = null;

  if (taskId) {
    authStatus = await requestRaw(
      `${baseUrl}/api/seedance/status?task_id=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      },
    );
  }

  const unauthorizedOk = unauthGenerate.status === 401;
  const authGenerateOk = authGenerate.status >= 200 && authGenerate.status < 300 && Boolean(taskId);
  const authStatusOk = taskId ? authStatus && authStatus.status >= 200 && authStatus.status < 300 : false;

  const ok = unauthorizedOk && authGenerateOk && authStatusOk;

  return {
    url: baseUrl,
    ok,
    checks: {
      unauthGenerate: {
        status: unauthGenerate.status,
        error: unauthGenerate.json?.error || null,
      },
      authGenerate: {
        status: authGenerate.status,
        taskId: taskId || null,
        model: authGenerate.json?.data?.model || authGenerate.json?.model || null,
        error: authGenerate.json?.error || authGenerate.json?.message || null,
      },
      authStatus: {
        status: authStatus?.status || 0,
        state: authStatus?.json?.data?.status || authStatus?.json?.status || null,
        error: authStatus?.json?.error || null,
      },
    },
  };
};

const main = async () => {
  const rootEnv = readEnvFile(path.join(repoRoot, ".env.local"));
  const serverEnv = readEnvFile(path.join(repoRoot, ".env.server"));

  const webApiKey =
    process.env.FIREBASE_WEB_API_KEY
    || process.env.VITE_FIREBASE_API_KEY
    || rootEnv.VITE_FIREBASE_API_KEY;

  const rawCredentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS
    || serverEnv.GOOGLE_APPLICATION_CREDENTIALS
    || "";

  const credentialsPath = toAbsolutePath(repoRoot, rawCredentialsPath);

  ensure(webApiKey, "Missing Firebase Web API key. Set FIREBASE_WEB_API_KEY or VITE_FIREBASE_API_KEY.");
  ensure(rawCredentialsPath, "Missing GOOGLE_APPLICATION_CREDENTIALS path.");
  ensure(fs.existsSync(credentialsPath), `Service account file not found: ${credentialsPath}`);

  const targetUrls = resolveTargetUrls();
  if (targetUrls.length === 0) {
    throw new Error("No seedance smoke target URLs configured.");
  }

  const smokeModel = (process.env.SEEDANCE_SMOKE_MODEL || "seedance-2.0-fast").trim() || "seedance-2.0-fast";
  const promptPrefix = (process.env.SEEDANCE_SMOKE_PROMPT_PREFIX || "Seedance smoke test").trim() || "Seedance smoke test";

  const auth = await createIdToken({
    serviceAccountPath: credentialsPath,
    webApiKey,
  });

  const results = [];
  for (const targetUrl of targetUrls) {
    results.push(await runSeedanceSmokeForUrl({
      baseUrl: targetUrl,
      idToken: auth.idToken,
      model: smokeModel,
      promptPrefix,
    }));
  }

  const failed = results.filter((entry) => !entry.ok);

  const summary = {
    ok: failed.length === 0,
    model: smokeModel,
    targets: targetUrls,
    uid: auth.uid,
    requestTimeoutMs,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
