/**
 * sync-chatbot-server.mjs
 * Copies the chatbot Express server into functions-chatbot/server/
 * so it can be deployed as a Firebase Cloud Function.
 *
 * Run: node scripts/sync-chatbot-server.mjs
 *
 * NOTE: The `seedance-references/` subdirectory is intentionally preserved
 * across syncs so that uploaded reference images are not deleted.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminAppDir = resolve(__dirname, "..");

const TRACKED_SERVER_SRC = resolve(adminAppDir, "functions-chatbot", "server-src");
const LEGACY_CHATBOT_SERVER_SRC = "C:\\Projects\\Tooryan Chatbot\\Chatbot\\server";
const DEST = resolve(adminAppDir, "functions-chatbot", "server");
const PRESERVED_DIRS = ["seedance-references"];

const CHATBOT_SERVER_SRC = existsSync(TRACKED_SERVER_SRC)
  ? TRACKED_SERVER_SRC
  : LEGACY_CHATBOT_SERVER_SRC;

if (!existsSync(CHATBOT_SERVER_SRC)) {
  console.error("\nChatbot server source not found.");
  console.error(`Tried tracked source: ${TRACKED_SERVER_SRC}`);
  console.error(`Tried legacy source: ${LEGACY_CHATBOT_SERVER_SRC}`);
  console.error("Create functions-chatbot/server-src or update scripts/sync-chatbot-server.mjs.\n");
  process.exit(1);
}

if (existsSync(DEST)) {
  // Remove everything except the directories we want to preserve.
  for (const entry of readdirSync(DEST)) {
    if (PRESERVED_DIRS.includes(entry)) continue;
    rmSync(join(DEST, entry), { recursive: true, force: true });
  }
} else {
  mkdirSync(DEST, { recursive: true });
}

cpSync(CHATBOT_SERVER_SRC, DEST, { recursive: true });

// Ensure the seedance-references directory exists even on a fresh install.
mkdirSync(join(DEST, "seedance-references"), { recursive: true });

const sourceLabel = CHATBOT_SERVER_SRC === TRACKED_SERVER_SRC
  ? "tracked functions-chatbot/server-src"
  : "legacy external chatbot source";

console.log(`✅ Synced chatbot server (${sourceLabel}) → functions-chatbot/server/`);
