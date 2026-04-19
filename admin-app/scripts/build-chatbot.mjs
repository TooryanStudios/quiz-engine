/**
 * build-chatbot.mjs
 * Builds the Tooryan Chatbot and copies the output into the admin-app's
 * dist/chatbot/ folder so it is included in the Firebase Hosting deploy.
 *
 * Run: node scripts/build-chatbot.mjs
 * Or via npm: npm run build:chatbot
 */
import { execSync } from "child_process";
import { cpSync, existsSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminAppDir = resolve(__dirname, "..");
const chatbotDir = "C:\\Projects\\Tooryan Chatbot\\Chatbot";
const chatbotDistDir = resolve(chatbotDir, "dist");
const targetDir = resolve(adminAppDir, "dist", "chatbot");

// Validate the Railway API URL is set
const envFile = resolve(chatbotDir, ".env.production");
const envContent = existsSync(envFile)
  ? (await import("fs")).promises.readFile(envFile, "utf8").then
    ? (await (await import("fs")).promises.readFile(envFile, "utf8"))
    : ""
  : "";

if (typeof envContent === "string" && envContent.includes("REPLACE_WITH_RAILWAY_URL")) {
  console.warn(
    "\n⚠  WARNING: VITE_API_URL in .env.production still contains the placeholder.\n" +
    "   Deploy the backend to Railway first, then update:\n" +
    "   C:\\Projects\\Tooryan Chatbot\\Chatbot\\.env.production\n"
  );
}

console.log("📦 Building chatbot frontend...");
execSync("npm run build", {
  cwd: chatbotDir,
  stdio: "inherit",
});

if (!existsSync(chatbotDistDir)) {
  console.error("❌ Chatbot build failed — dist/ not found.");
  process.exit(1);
}

// Remove previous chatbot output if present
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true });
}

console.log("📂 Copying chatbot build → dist/chatbot/");
cpSync(chatbotDistDir, targetDir, { recursive: true });

console.log("✅ Chatbot merged into dist/chatbot/");
