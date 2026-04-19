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
import { app } from "./server/index.js";

export const chatbot = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    invoker: "public",
  },
  app
);
