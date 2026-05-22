import process from "node:process";
import { spawnSync } from "node:child_process";

const runNodeScript = (scriptPath) => {
  const result = spawnSync("node", [scriptPath], {
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.error) {
    throw new Error(`Failed to run ${scriptPath}: ${result.error.message}`);
  }

  const stdout = String(result.stdout || "").trim();
  const stderr = String(result.stderr || "").trim();

  if (result.status !== 0) {
    throw new Error(`${scriptPath} failed with exit code ${result.status}: ${stderr || stdout || "unknown error"}`);
  }

  let parsed = null;
  try {
    parsed = stdout ? JSON.parse(stdout.split(/\r?\n/).slice(-1)[0]) : null;
  } catch {
    parsed = null;
  }

  return {
    script: scriptPath,
    status: "ok",
    output: parsed,
    rawOutput: stdout,
  };
};

const main = async () => {
  const steps = [
    runNodeScript("./scripts/setup-platform-alerting.mjs"),
    runNodeScript("./scripts/setup-platform-dashboards.mjs"),
  ];

  console.log(JSON.stringify({
    ok: true,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "qyan-om",
    executedAt: new Date().toISOString(),
    steps,
  }));
};

main().catch((error) => {
  console.error(`Platform observability refresh failed: ${error?.message || "Unknown error"}`);
  process.exit(1);
});
