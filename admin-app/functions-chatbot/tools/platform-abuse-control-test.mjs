import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const requestTimeoutMs = Math.max(1000, Number(process.env.PLATFORM_ABUSE_TEST_REQUEST_TIMEOUT_MS || 30000));

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

const parseCsv = (value) => {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

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
    headers: response.headers,
    text,
    json,
  };
};

const getHeaderMap = (headers, names) => {
  const output = {};
  for (const name of names) {
    const value = headers.get(name);
    if (value) {
      output[name.toLowerCase()] = value;
    }
  }
  return output;
};

const toAbsolutePath = (rawPath) => {
  if (!rawPath) {
    return "";
  }
  return path.isAbsolute(rawPath) ? rawPath : path.join(repoRoot, rawPath);
};

const createIdToken = async ({ serviceAccountPath, webApiKey }) => {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  const app = getApps()[0] || initializeApp(
    {
      credential: cert(serviceAccount),
    },
    `abuse-test-${Date.now()}`,
  );

  const uid = `abuse-test-${Date.now()}`;
  const customToken = await getAuth(app).createCustomToken(uid);

  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(webApiKey)}`;
  const signIn = await requestRaw(signInUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    }),
  });

  const idToken = signIn.json?.idToken;
  if (!idToken) {
    throw new Error(`Failed to obtain idToken from Firebase Auth. Status=${signIn.status}`);
  }

  return {
    uid,
    idToken,
  };
};

const hammerUntil429 = async ({
  name,
  baseUrl,
  idToken,
  makeRequest,
  maxAttempts,
  concurrency,
}) => {
  let attemptsSent = 0;
  let lastResponse = null;
  let timeoutErrors = 0;
  let lastErrorMessage = "";
  const waveSize = Math.max(1, Number(concurrency) || 1);

  while (attemptsSent < maxAttempts) {
    const remaining = maxAttempts - attemptsSent;
    const currentWaveSize = Math.min(waveSize, remaining);
    const wavePromises = [];

    for (let index = 0; index < currentWaveSize; index += 1) {
      const attempt = attemptsSent + index + 1;
      wavePromises.push(
        makeRequest({
          attempt,
          authHeaders: {
            Authorization: `Bearer ${idToken}`,
          },
          baseUrl,
        })
          .then((response) => ({ attempt, response, error: null }))
          .catch((error) => ({ attempt, response: null, error })),
      );
    }

    const waveResults = await Promise.all(wavePromises);
    attemptsSent += currentWaveSize;

    for (const result of waveResults) {
      if (result.error) {
        const message = String(result.error?.message || "unknown error");
        if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
          timeoutErrors += 1;
        }
        lastErrorMessage = `Request failed on attempt ${result.attempt}: ${message}`;
        continue;
      }

      lastResponse = result.response;
      if (result.response && result.response.status === 429) {
        return {
          name,
          ok: true,
          rateLimitTriggered: true,
          attempt: result.attempt,
          status: result.response.status,
          headers: getHeaderMap(result.response.headers, [
            "Retry-After",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
          ]),
          body: result.response.json || result.response.text || null,
        };
      }
    }
  }

  return {
    name,
    ok: false,
    rateLimitTriggered: false,
    attempt: attemptsSent,
    status: lastResponse?.status || 0,
    headers: lastResponse
      ? getHeaderMap(lastResponse.headers, [
        "Retry-After",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
      ])
      : {},
    body: lastResponse?.json || lastResponse?.text || null,
    error: lastErrorMessage || `Did not receive 429 within ${maxAttempts} attempts.`,
    timeoutErrors,
  };
};

const main = async () => {
  const rootEnv = readEnvFile(path.join(repoRoot, ".env.local"));
  const serverEnv = readEnvFile(path.join(repoRoot, ".env.server"));

  const baseUrl =
    process.env.PLATFORM_BASE_URL ||
    process.env.CHATBOT_FUNCTION_URL ||
    "https://chatbot-blux3lwhuq-uc.a.run.app";

  const webApiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    rootEnv.VITE_FIREBASE_API_KEY;

  const rawCredentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    serverEnv.GOOGLE_APPLICATION_CREDENTIALS ||
    "";

  const credentialsPath = toAbsolutePath(rawCredentialsPath);

  ensure(webApiKey, "Missing Firebase Web API key. Set FIREBASE_WEB_API_KEY or VITE_FIREBASE_API_KEY.");
  ensure(rawCredentialsPath, "Missing GOOGLE_APPLICATION_CREDENTIALS path.");
  ensure(fs.existsSync(credentialsPath), `Service account file not found: ${credentialsPath}`);

  const { uid, idToken } = await createIdToken({
    serviceAccountPath: credentialsPath,
    webApiKey,
  });

  const health = await requestRaw(`${baseUrl}/api/platform/rate-limits/health`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const healthLimits = health.json?.health?.limits || {};
  const limitOrDefault = (name, fallback) => {
    const parsed = Number(healthLimits?.[name]);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  };

  const testPadding = Number(process.env.PLATFORM_ABUSE_TEST_PADDING || 6);
  const maxCap = Number(process.env.PLATFORM_ABUSE_TEST_MAX_CAP || 500);
  const defaultConcurrency = Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY || 8);
  const attemptMultiplier = Math.max(1, Number(process.env.PLATFORM_ABUSE_TEST_ATTEMPT_MULTIPLIER || 1));
  const minAttempts = Math.max(0, Number(process.env.PLATFORM_ABUSE_TEST_MIN_ATTEMPTS || 0));
  const cappedAttempts = (limit) => {
    const padded = limit + testPadding;
    const scaled = Math.ceil(limit * attemptMultiplier);
    const desired = Math.max(padded, scaled, minAttempts);
    return Math.max(1, Math.min(desired, maxCap));
  };

  const tests = [
    {
      name: "workflowList",
      maxAttempts: cappedAttempts(limitOrDefault("workflowListUserPerMinute", 90)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_WORKFLOW_LIST || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/workflows/jobs?limit=1&attempt=${attempt}`, {
        method: "GET",
        headers: authHeaders,
      }),
    },
    {
      name: "workflowGet",
      maxAttempts: cappedAttempts(limitOrDefault("workflowGetUserPerMinute", 240)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_WORKFLOW_GET || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/workflows/jobs/nonexistent-job-${attempt}`, {
        method: "GET",
        headers: authHeaders,
      }),
    },
    {
      name: "workflowSubmit",
      maxAttempts: cappedAttempts(limitOrDefault("submitUserPerMinute", 20)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_WORKFLOW_SUBMIT || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/workflows/jobs`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `abuse test ${attempt}`,
          goal: "abuse control test",
          projectId: `abuse-project-${uid}`,
          workspaceId: "abuse-workspace",
        }),
      }),
    },
    {
      name: "uploadList",
      maxAttempts: cappedAttempts(limitOrDefault("uploadListUserPerMinute", 120)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_UPLOAD_LIST || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/uploads/sessions?limit=1&attempt=${attempt}`, {
        method: "GET",
        headers: authHeaders,
      }),
    },
    {
      name: "uploadGet",
      maxAttempts: cappedAttempts(limitOrDefault("uploadGetUserPerMinute", 300)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_UPLOAD_GET || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/uploads/sessions/nonexistent-session-${attempt}`, {
        method: "GET",
        headers: authHeaders,
      }),
    },
    {
      name: "uploadCreate",
      maxAttempts: cappedAttempts(limitOrDefault("uploadCreateUserPerMinute", 80)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_UPLOAD_CREATE || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/uploads/sessions`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: `abuse-test-${attempt}.mp4`,
          contentType: "video/mp4",
          byteSize: 1024,
          storagePathPrefix: "platform-uploads/abuse-tests",
          projectId: `abuse-project-${uid}`,
          workspaceId: "abuse-workspace",
          prompt: "Abuse control upload create test",
          goal: "Validate upload create rate limit",
        }),
      }),
    },
    {
      name: "uploadMutate",
      maxAttempts: cappedAttempts(limitOrDefault("uploadMutateUserPerMinute", 180)),
      concurrency: Number(process.env.PLATFORM_ABUSE_TEST_CONCURRENCY_UPLOAD_MUTATE || defaultConcurrency),
      makeRequest: ({ attempt, authHeaders }) => requestRaw(`${baseUrl}/api/platform/uploads/sessions/nonexistent-session-${attempt}/complete`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bytesUploaded: 1 }),
      }),
    },
  ];

  const selectedChecks = new Set(parseCsv(process.env.PLATFORM_ABUSE_TEST_CHECKS).map((name) => name.toLowerCase()));
  const activeTests = selectedChecks.size
    ? tests.filter((test) => selectedChecks.has(test.name.toLowerCase()))
    : tests;

  if (!activeTests.length) {
    throw new Error("No abuse-control checks selected. Set PLATFORM_ABUSE_TEST_CHECKS to valid check names.");
  }

  console.error(`[abuse-test] baseUrl=${baseUrl}`);
  console.error(`[abuse-test] checks=${activeTests.map((test) => test.name).join(",")}`);
  console.error(
    `[abuse-test] requestTimeoutMs=${requestTimeoutMs} defaultConcurrency=${defaultConcurrency} maxCap=${maxCap} attemptMultiplier=${attemptMultiplier} minAttempts=${minAttempts}`,
  );

  const checks = [];
  for (const test of activeTests) {
    console.error(
      `[abuse-test] running check=${test.name} maxAttempts=${test.maxAttempts} concurrency=${test.concurrency}`,
    );
    const result = await hammerUntil429({
      name: test.name,
      baseUrl,
      idToken,
      makeRequest: test.makeRequest,
      maxAttempts: test.maxAttempts,
      concurrency: test.concurrency,
    });
    console.error(
      `[abuse-test] done check=${test.name} ok=${result.ok} status=${result.status} attempt=${result.attempt}`,
    );
    checks.push(result);
  }

  const allChecksPassed = checks.every((check) => check.ok);
  const healthOk = health.status === 200;

  const summary = {
    ok: healthOk && allChecksPassed,
    baseUrl,
    uid,
    health: {
      status: health.status,
      body: health.json || health.text || null,
    },
    checks,
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary));

  if (!summary.ok) {
    process.exit(1);
  }
};

main().catch((error) => {
  const message = error?.message || "Unknown abuse-control test error.";
  console.error(`Platform abuse-control test failed: ${message}`);
  process.exit(1);
});
