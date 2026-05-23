import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const testScriptPath = path.join(repoRoot, "functions-chatbot", "tools", "platform-abuse-control-test.mjs");

const checks = [
  "workflowList",
  "workflowGet",
  "workflowSubmit",
  "uploadList",
  "uploadGet",
  "uploadCreate",
  "uploadMutate",
];

const defaultEnv = {
  PLATFORM_ABUSE_TEST_REQUEST_TIMEOUT_MS: "30000",
  PLATFORM_ABUSE_TEST_MAX_CAP: "900",
  PLATFORM_ABUSE_TEST_ATTEMPT_MULTIPLIER: "3",
  PLATFORM_ABUSE_TEST_PADDING: "8",
};

const concurrencyByCheck = {
  workflowSubmit: "16",
  uploadCreate: "16",
  workflowList: "28",
  uploadList: "28",
  uploadMutate: "28",
  workflowGet: "32",
  uploadGet: "32",
};

const fallbackConcurrency = "24";

const parseLastJsonObject = (text) => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith("{") || !line.endsWith("}")) {
      continue;
    }

    try {
      return JSON.parse(line);
    } catch {
      // Skip malformed JSON-like output lines.
    }
  }

  return null;
};

const results = [];

for (const check of checks) {
  const runEnv = {
    ...process.env,
    ...defaultEnv,
    PLATFORM_ABUSE_TEST_CHECKS: check,
    PLATFORM_ABUSE_TEST_CONCURRENCY: concurrencyByCheck[check] || fallbackConcurrency,
  };

  const run = spawnSync(process.execPath, [testScriptPath], {
    cwd: repoRoot,
    env: runEnv,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  const combinedOutput = `${run.stdout || ""}\n${run.stderr || ""}`;
  const parsed = parseLastJsonObject(combinedOutput);

  if (!parsed || !Array.isArray(parsed.checks) || !parsed.checks.length) {
    results.push({
      check,
      passed: false,
      status: 0,
      attempt: 0,
      rateLimitTriggered: false,
      retryAfter: null,
      error: parsed ? "Check payload missing." : "No JSON output parsed",
    });
    continue;
  }

  const row = parsed.checks[0] || {};
  results.push({
    check: row.name || check,
    passed: Boolean(row.ok),
    status: Number(row.status || 0),
    attempt: Number(row.attempt || 0),
    rateLimitTriggered: Boolean(row.rateLimitTriggered),
    retryAfter: row?.headers?.["retry-after"] || null,
    error: row.error || null,
  });
}

const final = {
  generatedAt: new Date().toISOString(),
  overallPass: results.every((row) => row.passed),
  results,
};

console.log(JSON.stringify(final));
console.log("TABLE_START");
for (const row of results) {
  console.log([
    row.check,
    row.passed,
    row.status,
    row.attempt,
    row.rateLimitTriggered,
    row.retryAfter ?? "",
    row.error ?? "",
  ].join("\t"));
}
console.log("TABLE_END");

if (!final.overallPass) {
  process.exit(1);
}
