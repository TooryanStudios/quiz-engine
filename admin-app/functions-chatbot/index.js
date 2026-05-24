/**
 * Firebase Cloud Function wrapper for the Tooryan Chatbot Express backend.
 *
 * The server/index.js in this directory is populated by:
 *   node scripts/sync-chatbot-server.mjs
 *
 * Environment variables needed (set in functions-chatbot/.env or Firebase console):
 *   OPENAI_API_KEY        — required
 *   FRONTEND_ORIGIN       — set to https://qyan.app
 *   (see .env.example for full list)
 */
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { app } from "./server/index.js";
import { initializePlatformInfrastructure } from "./platform/bootstrap.js";
import { runPlatformRetentionCleanup } from "./platform/retentionCleanup.js";

const platformValidationWebhookSecret = defineSecret("PLATFORM_VALIDATION_WEBHOOK_SECRET");

initializePlatformInfrastructure({
  app,
  getValidationWebhookSecret: () => platformValidationWebhookSecret.value(),
});

export const chatbot = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    invoker: "public",
    secrets: [platformValidationWebhookSecret],
  },
  app
);

export const platformRetentionCleanup = onSchedule(
  {
    region: "us-central1",
    schedule: process.env.PLATFORM_RETENTION_SCHEDULE || "every 24 hours",
    timeZone: process.env.PLATFORM_RETENTION_TIMEZONE || "UTC",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async () => {
    const result = await runPlatformRetentionCleanup();
    console.log("platformRetentionCleanup result", JSON.stringify(result));
    return result;
  },
);
