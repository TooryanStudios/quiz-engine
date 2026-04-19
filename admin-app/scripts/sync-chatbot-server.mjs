/**
 * sync-chatbot-server.mjs
 * Copies the chatbot Express server into functions-chatbot/server/
 * so it can be deployed as a Firebase Cloud Function.
 *
 * Run: node scripts/sync-chatbot-server.mjs
 */
import { cpSync, existsSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminAppDir = resolve(__dirname, "..");

const CHATBOT_SERVER_SRC = "C:\\Projects\\Tooryan Chatbot\\Chatbot\\server";
const DEST = resolve(adminAppDir, "functions-chatbot", "server");

if (!existsSync(CHATBOT_SERVER_SRC)) {
  console.error(`\nChatbot server not found at: ${CHATBOT_SERVER_SRC}`);
  console.error("Copy the chatbot project first, or update the path in this script.\n");
  process.exit(1);
}

if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true, force: true });
}

cpSync(CHATBOT_SERVER_SRC, DEST, { recursive: true });
console.log(`✅ Synced chatbot server → functions-chatbot/server/`);
