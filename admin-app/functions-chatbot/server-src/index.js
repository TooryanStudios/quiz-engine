import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { ensurePlatformFirebaseAdminApp } from "../platform/firebaseAdmin.js";
import { createFirebaseAuthVerifier } from "../platform/auth.js";
import { createImageLibraryAdapter } from "./integrations/imageLibraryAdapter.js";
import { createInsightAdapter } from "./integrations/insightAdapter.js";
import { createReportAdapter } from "./integrations/reportAdapter.js";
import { createServiceAdapter } from "./integrations/serviceAdapter.js";
import { createSupportAdapter } from "./integrations/supportAdapter.js";
import { createChatToolRuntime } from "./tools/chatTools.js";

dotenv.config({ path: ".env.server" });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

const frontendOriginRaw = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const allowedOrigins = frontendOriginRaw.split(",").map((o) => o.trim()).filter(Boolean);
const integrationTimeoutMs = Number(process.env.INTEGRATION_TIMEOUT_MS || 15000);
const sharedIntegrationApiKey = (process.env.INTEGRATION_API_KEY || "").trim();
const sharedIntegrationBearerToken = (
  process.env.INTEGRATION_BEARER_TOKEN || ""
).trim();

const openAIChatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const openAITtsModel = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const openAITtsVoice = process.env.OPENAI_TTS_VOICE || "ash";
const openAIRealtimeModel =
  process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";
const openAIRealtimeTranscriptionModel =
  process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ||
  "gpt-4o-mini-transcribe";
const openAIChatInstructions =
  process.env.OPENAI_CHAT_INSTRUCTIONS ||
  "You are Ahmed, a concise and friendly assistant. Use the available tools whenever the user asks for live system status, service information, reports, or ticket creation. Do not claim a tool result unless you actually used the tool.";
const openAIRealtimeInstructions =
  process.env.OPENAI_REALTIME_INSTRUCTIONS ||
  "You are Ahmed, a concise and friendly voice assistant.";

const MAX_TOOL_ROUNDS = 6;
const MAX_CHAT_SESSIONS = 100;
const chatSessions = new Map();
const SUPPORTED_LOCALES = ["en", "ar"];
const LOCAL_IMAGE_LIBRARY_DIR = path.resolve(
  process.cwd(),
  "public",
  "demo-image-library"
);
const LOCAL_IMAGE_LIBRARY_PUBLIC_BASE = "/demo-image-library";
const SCENE_SETTINGS_FILE_PATH = path.resolve(
  process.cwd(),
  "public",
  "scene-settings.json"
);
const LOCAL_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
]);
const IMAGE_QUERY_SYNONYMS = new Map([
  ["coast", ["waterfront", "shore", "beach"]],
  ["shore", ["waterfront", "coast", "beach"]],
  ["beach", ["waterfront", "coast", "shore"]],
  ["landmark", ["monument", "heritage", "attraction"]],
  ["monument", ["landmark", "heritage"]],
  ["harbor", ["port", "waterfront"]],
  ["harbour", ["port", "waterfront"]],
  ["port", ["harbor", "harbour", "waterfront"]],
  ["muscat", ["oman"]],
  ["oman", ["muscat"]],
  ["واجهة", ["بحرية", "شاطئ", "ساحل", "waterfront", "coast"]],
  ["بحرية", ["واجهة", "ساحل", "شاطئ", "waterfront", "coast"]],
  ["ساحل", ["شاطئ", "بحرية", "واجهة", "coast", "waterfront"]],
  ["شاطئ", ["ساحل", "بحرية", "واجهة", "beach", "waterfront"]],
  ["معلم", ["آثار", "تراث", "وجهة"]],
  ["آثار", ["معلم", "تراث"]],
  ["مسقط", ["عمان", "muscat", "oman"]],
  ["عمان", ["مسقط", "oman", "muscat"]],
]);

const resolveOpenAIApiKey = () => {
  const candidate = (
    process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || ""
  ).trim();

  if (!candidate || candidate === "YOUR_OPENAI_API_KEY") {
    return "";
  }

  return candidate;
};

const resolveN8nBaseUrl = () => {
  const candidate = (process.env.N8N_API_URL || "").trim().replace(/\/$/, "");

  if (!candidate || candidate === "https://YOUR_N8N_URL") {
    return "";
  }

  return candidate;
};

const openAIApiKey = resolveOpenAIApiKey();
const n8nBaseUrl = resolveN8nBaseUrl();
const serviceAdapter = createServiceAdapter({
  lookupUrl: (process.env.SERVICES_LOOKUP_URL || "").trim(),
  apiKey: (process.env.SERVICES_API_KEY || sharedIntegrationApiKey).trim(),
  bearerToken: (
    process.env.SERVICES_BEARER_TOKEN || sharedIntegrationBearerToken
  ).trim(),
  timeoutMs: integrationTimeoutMs,
});
const reportAdapter = createReportAdapter({
  lookupUrl: (process.env.REPORTS_LOOKUP_URL || "").trim(),
  apiKey: (process.env.REPORTS_API_KEY || sharedIntegrationApiKey).trim(),
  bearerToken: (
    process.env.REPORTS_BEARER_TOKEN || sharedIntegrationBearerToken
  ).trim(),
  timeoutMs: integrationTimeoutMs,
});
const supportAdapter = createSupportAdapter({
  createUrl: (process.env.SUPPORT_TICKETS_URL || "").trim(),
  apiKey: (process.env.SUPPORT_API_KEY || sharedIntegrationApiKey).trim(),
  bearerToken: (
    process.env.SUPPORT_BEARER_TOKEN || sharedIntegrationBearerToken
  ).trim(),
  timeoutMs: integrationTimeoutMs,
});
const insightAdapter = createInsightAdapter({
  lookupUrl: (process.env.INSIGHTS_LOOKUP_URL || "").trim(),
  apiKey: (process.env.INSIGHTS_API_KEY || sharedIntegrationApiKey).trim(),
  bearerToken: (
    process.env.INSIGHTS_BEARER_TOKEN || sharedIntegrationBearerToken
  ).trim(),
  timeoutMs: integrationTimeoutMs,
});
const imageLibraryAdapter = createImageLibraryAdapter({
  lookupUrl: (process.env.IMAGE_LIBRARY_URL || "").trim(),
  apiKey: (process.env.IMAGE_LIBRARY_API_KEY || sharedIntegrationApiKey).trim(),
  bearerToken: (
    process.env.IMAGE_LIBRARY_BEARER_TOKEN || sharedIntegrationBearerToken
  ).trim(),
  timeoutMs: integrationTimeoutMs,
});
const { chatTools, executeToolCall, getRuntimeStats } = createChatToolRuntime({
  openAIConfigured: Boolean(openAIApiKey),
  openAIChatModel,
  openAITtsModel,
  openAITtsVoice,
  openAIRealtimeModel,
  frontendOrigin: frontendOriginRaw,
  fallbackConfigured: Boolean(n8nBaseUrl),
  serviceAdapter,
  reportAdapter,
  supportAdapter,
  insightAdapter,
  imageLibraryAdapter,
});

if (!process.env.OPENAI_API_KEY && process.env.VITE_OPENAI_API_KEY) {
  console.warn(
    "Using VITE_OPENAI_API_KEY on backend. Move this value to OPENAI_API_KEY in .env.server for secure setup."
  );
}

app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  })
);
app.use(express.json({ limit: "2mb" }));

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const parseUpstreamBody = async (response) => {
  const rawText = await response.text();
  if (!rawText.trim()) {
    if (!response.ok) {
      return { error: `Upstream returned HTTP ${response.status} with an empty response body.` };
    }
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch (_error) {
    return {
      error: rawText.trim().slice(0, 500),
      _upstreamNonJson: true,
    };
  }
};

const trimChatSessions = () => {
  while (chatSessions.size > MAX_CHAT_SESSIONS) {
    const oldestSessionId = chatSessions.keys().next().value;
    chatSessions.delete(oldestSessionId);
  }
};

const getChatSession = (sessionId) => {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return null;
  }

  const existingSession = chatSessions.get(sessionId);
  if (!existingSession) {
    return null;
  }

  chatSessions.delete(sessionId);
  chatSessions.set(sessionId, existingSession);
  return existingSession;
};

const setChatSession = (sessionId, sessionState) => {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return;
  }

  if (chatSessions.has(sessionId)) {
    chatSessions.delete(sessionId);
  }

  chatSessions.set(sessionId, {
    ...sessionState,
    updatedAt: Date.now(),
  });
  trimChatSessions();
};

const resolveRequestedLocale = (locale) =>
  SUPPORTED_LOCALES.includes(locale) ? locale : "en";

const buildChatInstructions = (locale) => {
  const resolvedLocale = resolveRequestedLocale(locale);
  const personaGuardEn =
    "Identity rule: Your name is Ahmed. If asked your name or role, answer as Ahmed, the Digital Service Specialist. Never say you are unnamed, generic, or 'just an assistant'.";
  const personaGuardAr =
    "قاعدة الهوية: اسمك أحمد. إذا سُئلت عن الاسم أو الدور فأجب أنك أحمد اختصاصي الخدمات الرقمية. لا تقل أبداً إنك بلا اسم أو مساعد عام.";

  if (resolvedLocale === "ar") {
    return `${openAIChatInstructions}\n${personaGuardAr}\nواجهة المستخدم باللغة العربية. أجب بالعربية الفصحى الواضحة ما لم يطلب المستخدم خلاف ذلك.\nاستخدم الأدوات المتاحة عند السؤال عن حالة الخدمات الحالية أو تفاصيل خدمة أو تقرير أو إنشاء تذكرة دعم أو إحصائية مباشرة أو صورة من مكتبة الصور.\nاستخدم get_service_status لحالة الخدمات الحالية، و lookup_service للبحث عن الخدمات، و get_report للتقارير، و create_support_ticket لإنشاء تذكرة دعم، و get_live_insight للإحصائيات والأرقام المباشرة، و search_image_library لعرض صور مرتبطة بالموضوع.\nعند إرجاع الأداة صوراً أو مرئيات، اذكرها بإيجاز فقط ولا تطبع روابط الصور أو data URI أو JSON خام أو Markdown للصور، لأن الواجهة ستعرضها تلقائياً.\nاستخدم dismiss_results عند طلب المستخدم إغلاق أو إخفاء أو إلغاء لوحة النتائج أو معرض الصور.\nيمكن للمستخدم النقر على أي صورة في لوحة النتائج لتكبيرها — إذا طُلب تكبير صورة بعينها، أخبر المستخدم بالنقر عليها مباشرة.`;
  }

  return `${openAIChatInstructions}\n${personaGuardEn}\nThe user interface locale is English. Respond in English unless the user asks for another language.\nUse get_service_status for live service status, lookup_service for service information, get_report for operational reports, create_support_ticket for support requests, get_live_insight for statistics or endpoint-backed facts, and search_image_library for images or visual references.\nWhen a tool returns images or structured visuals, mention them briefly but do not print raw image URLs, data URIs, JSON blobs, or Markdown image tags because the UI renders visuals separately.\nUse dismiss_results when the user asks to close, hide, dismiss, or clear the results panel or image gallery.\nUsers can click any image in the results panel to enlarge it — if asked to enlarge or zoom a specific image, tell the user to click it directly.`;
};

const buildRealtimeInstructions = (locale) => {
  const resolvedLocale = resolveRequestedLocale(locale);
  const personaGuardEn =
    "Identity rule: Your name is Ahmed. If asked your name or role, answer as Ahmed, the Digital Service Specialist. Never say you are unnamed, generic, or 'just an assistant'.";
  const personaGuardAr =
    "قاعدة الهوية: اسمك أحمد. إذا سُئلت عن الاسم أو الدور فأجب أنك أحمد اختصاصي الخدمات الرقمية. لا تقل أبداً إنك بلا اسم أو مساعد عام.";

  if (resolvedLocale === "ar") {
    return `${openAIRealtimeInstructions}\n${personaGuardAr}\nتحدث بالعربية الفصحى الواضحة ما لم يطلب المستخدم لغة أخرى.`;
  }

  return `${openAIRealtimeInstructions}\n${personaGuardEn}\nSpeak in English unless the user asks for another language.`;
};

const extractOutputText = (payload) => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) {
    return "";
  }

  const textChunks = [];
  for (const item of payload.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const contentPart of item.content) {
      if (
        (contentPart?.type === "output_text" || contentPart?.type === "text") &&
        typeof contentPart?.text === "string"
      ) {
        textChunks.push(contentPart.text);
      }
    }
  }

  return textChunks.join("\n").trim();
};

const extractToolCalls = (payload) => {
  if (!Array.isArray(payload?.output)) {
    return [];
  }

  return payload.output.filter(
    (item) =>
      item?.type === "function_call" &&
      typeof item?.name === "string" &&
      typeof item?.call_id === "string"
  );
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const VISUAL_FIELD_KEYS = new Set(["src", "url", "image", "thumbnailUrl"]);

const truncateModelString = (value, maxLength = 280) => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 3)}...`;
};

const summarizeImagesForModel = (images) => ({
  count: images.length,
  items: images.slice(0, 4).map((image, index) => ({
    title:
      typeof image === "object" && image !== null
        ? image.title || image.alt || `Visual ${index + 1}`
        : `Visual ${index + 1}`,
    note: "Rendered in the live results panel.",
  })),
  note: "Visual assets are available in the live results panel. Do not repeat raw URLs in the reply.",
});

const sanitizeToolOutputForModel = (value, depth = 0, key = "") => {
  if (depth > 5) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    const sliceSize = key === "images" ? 4 : 8;
    return value
      .slice(0, sliceSize)
      .map((entry) => sanitizeToolOutputForModel(entry, depth + 1, key));
  }

  if (isPlainObject(value)) {
    const sanitizedObject = {};

    for (const [entryKey, entryValue] of Object.entries(value)) {
      if (entryKey === "images" && Array.isArray(entryValue)) {
        sanitizedObject.images = summarizeImagesForModel(entryValue);
        continue;
      }

      sanitizedObject[entryKey] = sanitizeToolOutputForModel(
        entryValue,
        depth + 1,
        entryKey
      );
    }

    return sanitizedObject;
  }

  if (typeof value === "string") {
    if (VISUAL_FIELD_KEYS.has(key) || value.startsWith("data:image")) {
      return "[visual asset omitted; rendered in live results panel]";
    }

    return truncateModelString(value);
  }

  return value;
};

const buildToolOutputForModel = (output) =>
  JSON.stringify(sanitizeToolOutputForModel(output));

const tokenizeTextForStreaming = (text) => {
  const normalized = typeof text === "string" ? text : "";
  if (!normalized) {
    return [];
  }

  const tokens = normalized.match(/\S+\s*/g);
  return Array.isArray(tokens) && tokens.length > 0 ? tokens : [normalized];
};

const consumeSseStream = async (response, onEvent) => {
  const streamReader = response.body?.getReader?.();
  if (!streamReader) {
    throw new Error("OpenAI streaming response body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  const processChunk = (chunk) => {
    const lines = chunk.split("\n");
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (!dataLines.length) {
      return;
    }

    const data = dataLines.join("\n");
    if (!data || data === "[DONE]") {
      return;
    }

    try {
      const event = JSON.parse(data);
      onEvent(event);
    } catch (_error) {
      // Ignore malformed chunks and continue processing subsequent events.
    }
  };

  while (true) {
    const { value, done } = await streamReader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let eventBoundary = buffer.indexOf("\n\n");
    while (eventBoundary !== -1) {
      const rawEvent = buffer.slice(0, eventBoundary).trim();
      buffer = buffer.slice(eventBoundary + 2);
      if (rawEvent) {
        processChunk(rawEvent);
      }
      eventBoundary = buffer.indexOf("\n\n");
    }

    if (done) {
      const remaining = buffer.trim();
      if (remaining) {
        processChunk(remaining);
      }
      break;
    }
  }
};

const streamOpenAIResponseTextNoTools = async (
  message,
  sessionId,
  locale,
  onDelta
) => {
  if (!openAIApiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing on the backend. Add it to .env.server and restart the server."
    );
  }

  const existingSession = getChatSession(sessionId);
  let previousResponseId = existingSession?.previousResponseId || null;

  const requestBody = {
    model: openAIChatModel,
    instructions: buildChatInstructions(locale),
    input: message,
    stream: true,
  };

  if (previousResponseId) {
    requestBody.previous_response_id = previousResponseId;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const payload = await safeJson(response);
    const errorMessage = payload?.error?.message || "OpenAI streaming request failed.";
    throw new Error(errorMessage);
  }

  let outputText = "";
  let completedResponse = null;
  let streamError = null;

  await consumeSseStream(response, (event) => {
    if (event?.response?.id) {
      previousResponseId = event.response.id;
    }

    if (event?.type === "response.output_text.delta" && typeof event.delta === "string") {
      outputText += event.delta;
      onDelta(event.delta);
      return;
    }

    if (event?.type === "response.completed" && event.response) {
      completedResponse = event.response;
      if (event.response.id) {
        previousResponseId = event.response.id;
      }
      return;
    }

    if (event?.type === "error") {
      streamError = new Error(
        event?.error?.message || "OpenAI streaming chat failed."
      );
    }
  });

  if (streamError) {
    throw streamError;
  }

  if (!outputText && completedResponse) {
    const completedText = extractOutputText(completedResponse);
    if (completedText) {
      outputText = completedText;
      for (const token of tokenizeTextForStreaming(completedText)) {
        onDelta(token);
      }
    }
  }

  if (!outputText.trim()) {
    throw new Error("OpenAI returned an empty streaming chat response.");
  }

  setChatSession(sessionId, { previousResponseId });
  return {
    output: outputText.trim(),
    toolCalls: [],
  };
};


const callOpenAIResponsesApi = async (body) => {
  if (!openAIApiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing on the backend. Add it to .env.server and restart the server."
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    const errorMessage = payload?.error?.message || "OpenAI chat request failed.";
    throw new Error(errorMessage);
  }

  return payload;
};

const fetchOpenAIResponseText = async (
  message,
  sessionId,
  locale,
  { useTools = true } = {}
) => {
  const existingSession = getChatSession(sessionId);
  let previousResponseId = existingSession?.previousResponseId || null;
  let input = message;
  const executedToolCalls = [];

  for (let iteration = 0; iteration < MAX_TOOL_ROUNDS; iteration += 1) {
    const requestBody = {
      model: openAIChatModel,
      instructions: buildChatInstructions(locale),
      input,
    };

    if (useTools && chatTools.length > 0) {
      requestBody.tools = chatTools;
    }

    if (previousResponseId) {
      requestBody.previous_response_id = previousResponseId;
    }

    const payload = await callOpenAIResponsesApi(requestBody);
    previousResponseId = payload?.id || previousResponseId;

    const toolCalls = extractToolCalls(payload);
    if (!toolCalls.length) {
      const output = extractOutputText(payload);
      if (!output) {
        throw new Error("OpenAI returned an empty chat response.");
      }

      setChatSession(sessionId, { previousResponseId });
      return {
        output,
        toolCalls: executedToolCalls,
      };
    }

    input = [];

    for (const toolCall of toolCalls) {
      const executedTool = await executeToolCall(toolCall);
      executedToolCalls.push({
        name: executedTool.name,
        arguments: executedTool.arguments,
        output: executedTool.output,
      });
      input.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: buildToolOutputForModel(executedTool.output),
      });
    }
  }

  throw new Error("OpenAI tool execution exceeded the maximum number of steps.");
};

const streamOpenAITts = async (text, res) => {
  if (!openAIApiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing on the backend. Add it to .env.server and restart the server."
    );
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify({
      model: openAITtsModel,
      voice: openAITtsVoice,
      input: text,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(Buffer.from(arrayBuffer));
};

const streamN8nTts = async (text, res) => {
  if (!n8nBaseUrl) {
    throw new Error("N8N_API_URL is not configured.");
  }

  const response = await fetch(
    `${n8nBaseUrl}/tts?message=${encodeURIComponent(text)}`
  );

  if (!response.ok) {
    throw new Error(`n8n TTS failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const arrayBuffer = await response.arrayBuffer();
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(Buffer.from(arrayBuffer));
};

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "chatbot-backend-proxy",
    endpoints: [
      "/health",
      "/api/chat",
      "/api/chat/stream",
      "/api/tts",
      "/api/realtime/session",
    ],
  });
});

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.status(204).end();
});

const sendHealthPayload = (_req, res) => {
  const runtimeStats = getRuntimeStats();

  res.json({
    ok: true,
    openaiConfigured: Boolean(openAIApiKey),
    openaiKeySource: process.env.OPENAI_API_KEY
      ? "OPENAI_API_KEY"
      : process.env.VITE_OPENAI_API_KEY
      ? "VITE_OPENAI_API_KEY"
      : null,
    n8nConfigured: Boolean(n8nBaseUrl),
    toolCallingEnabled: chatTools.length > 0,
    activeChatSessions: chatSessions.size,
    availableTools: runtimeStats.availableTools,
    integrations: runtimeStats.integrations,
    supportedLocales: SUPPORTED_LOCALES,
  });
};

const pickLocaleText = (locale, englishText, arabicText) =>
  resolveRequestedLocale(locale) === "ar" ? arabicText : englishText;

const buildPlaceholderImage = (
  title,
  subtitle,
  accent = "#0f766e",
  background = "#102125"
) => {
  const safeTitle = String(title || "Placeholder");
  const safeSubtitle = String(subtitle || "Temporary demo asset");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)" rx="48" />
      <circle cx="930" cy="180" r="150" fill="rgba(255,255,255,0.09)" />
      <circle cx="270" cy="720" r="220" fill="rgba(255,255,255,0.07)" />
      <rect x="110" y="110" width="980" height="680" rx="36" fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.28)" />
      <text x="160" y="320" fill="#f4f7f5" font-family="Segoe UI, Arial, sans-serif" font-size="74" font-weight="700">${safeTitle}</text>
      <text x="160" y="400" fill="#d6e7df" font-family="Segoe UI, Arial, sans-serif" font-size="32">${safeSubtitle}</text>
      <text x="160" y="720" fill="#d6e7df" font-family="Segoe UI, Arial, sans-serif" font-size="26">Temporary local placeholder image</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const humanizeImageFileName = (fileName) =>
  fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const tokenizeImageQuery = (value) =>
  String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06FF]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const expandImageQueryTokens = (queryTokens) => {
  const expandedTokenSet = new Set(queryTokens);

  for (const token of queryTokens) {
    const synonyms = IMAGE_QUERY_SYNONYMS.get(token) || [];
    for (const synonym of synonyms) {
      if (synonym.length > 1) {
        expandedTokenSet.add(synonym);
      }
    }
  }

  return Array.from(expandedTokenSet);
};

const scoreImageEntry = (entry, queryTokens) => {
  if (!queryTokens.length) {
    return 0;
  }

  const nameWithoutExtension = entry.normalizedName.replace(/\.[^.]+$/, "");
  let score = 0;

  for (const token of queryTokens) {
    const tokenIndex = nameWithoutExtension.indexOf(token);
    if (tokenIndex === -1) {
      continue;
    }

    score += 10;
    if (tokenIndex === 0) {
      score += 8;
    }
    if (nameWithoutExtension.includes(`-${token}-`)) {
      score += 4;
    }
    if (nameWithoutExtension.endsWith(`-${token}`)) {
      score += 3;
    }
  }

  if (queryTokens.every((token) => nameWithoutExtension.includes(token))) {
    score += 20;
  }

  return score;
};

const getLocalImageLibraryItems = async (query) => {
  try {
    const directoryEntries = await fs.readdir(LOCAL_IMAGE_LIBRARY_DIR, {
      withFileTypes: true,
    });

    const imageEntries = directoryEntries
      .filter(
        (entry) =>
          entry.isFile() &&
          LOCAL_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      )
      .map((entry) => {
        const normalizedName = entry.name.toLowerCase();
        return {
          fileName: entry.name,
          normalizedName,
          title: humanizeImageFileName(entry.name),
          src: `${LOCAL_IMAGE_LIBRARY_PUBLIC_BASE}/${encodeURIComponent(entry.name)}`,
        };
      });

    if (!imageEntries.length) {
      return [];
    }

    const queryTokens = tokenizeImageQuery(query);
    if (!queryTokens.length) {
      return imageEntries.slice(0, 12);
    }

    const expandedQueryTokens = expandImageQueryTokens(queryTokens);

    const scoredEntries = imageEntries
      .map((entry) => ({
        entry,
        score: scoreImageEntry(entry, expandedQueryTokens),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.entry.fileName.localeCompare(right.entry.fileName, "en", {
          sensitivity: "base",
        });
      })
      .map((candidate) => candidate.entry);

    return (scoredEntries.length ? scoredEntries : imageEntries).slice(0, 12);
  } catch (_error) {
    return [];
  }
};

const getPreferredLocalImage = async (query, fallbackTitle) => {
  const localImages = await getLocalImageLibraryItems(query);
  if (localImages.length) {
    return {
      src: localImages[0].src,
      title: localImages[0].title || fallbackTitle,
    };
  }

  return null;
};

app.get("/mock-integrations/services/lookup", async (req, res) => {
  const locale = resolveRequestedLocale(req.query?.locale);
  const query =
    typeof req.query?.query === "string" && req.query.query.trim()
      ? req.query.query.trim()
      : pickLocaleText(locale, "Digital ID Renewal", "تجديد الهوية الرقمية");

  const serviceImage =
    (await getPreferredLocalImage(
      query,
      pickLocaleText(locale, "Service Visual", "الصورة الخدمية")
    )) || {
      src: buildPlaceholderImage(
        pickLocaleText(locale, "Digital ID Renewal", "تجديد الهوية الرقمية"),
        pickLocaleText(locale, "Placeholder service visual", "صورة خدمة مؤقتة"),
        "#0f766e",
        "#173138"
      ),
      title: pickLocaleText(locale, "Service Visual", "الصورة الخدمية"),
    };

  res.json({
    found: true,
    query,
    service: {
      id: "svc-temp-digital-id-renewal",
      name: pickLocaleText(locale, "Digital ID Renewal", "تجديد الهوية الرقمية"),
      summary: pickLocaleText(
        locale,
        "Temporary placeholder service data for tender demo validation. Replace with the production service catalog endpoint later.",
        "بيانات خدمة مؤقتة لأغراض التحقق في العرض التوضيحي للعطاء. استبدلها لاحقاً بنقطة نهاية دليل الخدمات الفعلية."
      ),
      channel: pickLocaleText(locale, "Web portal and mobile app", "البوابة الإلكترونية والتطبيق المحمول"),
      availability: pickLocaleText(locale, "24/7", "على مدار الساعة"),
      estimatedProcessingTime: pickLocaleText(locale, "Under 5 minutes", "أقل من خمس دقائق"),
      requirements: pickLocaleText(
        locale,
        ["Valid national ID", "Verified mobile number", "Active digital identity account"],
        ["بطاقة هوية سارية", "رقم هاتف موثق", "حساب هوية رقمية نشط"]
      ),
      highlights: pickLocaleText(
        locale,
        [
          "Placeholder integration currently serves a deterministic service brief.",
          "This payload is suitable for UI verification before live integration cutover.",
        ],
        [
          "يقدم التكامل المؤقت حالياً ملخص خدمة ثابتاً لاختبار الواجهة.",
          "هذه الحمولة مناسبة للتحقق من الواجهة قبل التحول إلى التكامل الحي.",
        ]
      ),
      source: "Temporary Local Mock Integration",
      images: [serviceImage],
    },
  });
});

app.get("/mock-integrations/reports/lookup", (req, res) => {
  const locale = resolveRequestedLocale(req.query?.locale);
  const reportName =
    typeof req.query?.reportName === "string" && req.query.reportName.trim()
      ? req.query.reportName.trim()
      : pickLocaleText(locale, "Interaction Summary Report", "تقرير ملخص التفاعل");

  res.json({
    found: true,
    report: {
      id: "rpt-temp-interaction-summary",
      name: reportName,
      summary: pickLocaleText(
        locale,
        "Temporary operational metrics for verification of charts, KPI cards, and report rendering.",
        "مؤشرات تشغيلية مؤقتة للتحقق من الرسوم البيانية وبطاقات المؤشرات وعرض التقارير."
      ),
      headline: {
        label: pickLocaleText(locale, "Satisfaction", "الرضا"),
        value: pickLocaleText(locale, "94%", "94%"),
        source: "Temporary Local Mock Integration",
      },
      metrics: [
        { label: pickLocaleText(locale, "Sessions", "الجلسات"), value: 1275, displayValue: "1,275" },
        { label: pickLocaleText(locale, "Resolved", "تم الحل"), value: 1198, displayValue: "1,198" },
        { label: pickLocaleText(locale, "Average Response Seconds", "متوسط زمن الاستجابة بالثواني"), value: 18, displayValue: "18" },
      ],
      chart: {
        title: pickLocaleText(locale, "Weekly Service Volume", "حجم الخدمة الأسبوعي"),
        bars: [
          { label: pickLocaleText(locale, "Mon", "الإثنين"), value: 180, displayValue: "180" },
          { label: pickLocaleText(locale, "Tue", "الثلاثاء"), value: 224, displayValue: "224" },
          { label: pickLocaleText(locale, "Wed", "الأربعاء"), value: 205, displayValue: "205" },
          { label: pickLocaleText(locale, "Thu", "الخميس"), value: 260, displayValue: "260" },
          { label: pickLocaleText(locale, "Fri", "الجمعة"), value: 171, displayValue: "171" },
        ],
      },
      highlights: pickLocaleText(
        locale,
        [
          "Traffic and satisfaction values are temporary placeholders.",
          "Use this report to validate executive summary presentation before live reporting is connected.",
        ],
        [
          "قيم الحركة والرضا الحالية مؤقتة لأغراض الاختبار.",
          "استخدم هذا التقرير للتحقق من العرض التنفيذي قبل ربط تقارير الإنتاج الفعلية.",
        ]
      ),
      source: "Temporary Local Mock Integration",
    },
  });
});

app.post("/mock-integrations/support/tickets", (req, res) => {
  const locale = resolveRequestedLocale(req.body?.locale);
  const ticketId = `TEMP-${String(Date.now()).slice(-6)}`;

  res.json({
    created: true,
    ticket: {
      ticketId,
      status: pickLocaleText(locale, "open", "مفتوحة"),
      subject: req.body?.subject || pickLocaleText(locale, "Support Request", "طلب دعم"),
      requesterContact: req.body?.requesterContact || "temp.user@example.com",
      details: req.body?.details || pickLocaleText(locale, "Temporary support payload for testing.", "حمولة دعم مؤقتة للاختبار."),
      priority: req.body?.priority || "medium",
      estimatedResponse: pickLocaleText(locale, "15 minutes", "15 دقيقة"),
      source: "Temporary Local Mock Integration",
    },
  });
});

app.get("/mock-integrations/insights/lookup", async (req, res) => {
  const locale = resolveRequestedLocale(req.query?.locale);
  const query =
    typeof req.query?.query === "string" && req.query.query.trim()
      ? req.query.query.trim()
      : pickLocaleText(locale, "Population of Oman", "عدد سكان عُمان");

  const isPopulationQuery = /oman|population|عمان|عُمان|سكان/i.test(query);
  const title = isPopulationQuery
    ? pickLocaleText(locale, "Population of Oman", "عدد سكان عُمان")
    : query;

  const insightImage =
    (await getPreferredLocalImage(
      title,
      pickLocaleText(locale, "Insight Visual", "الصورة الداعمة")
    )) || {
      src: buildPlaceholderImage(
        title,
        pickLocaleText(locale, "Placeholder KPI visual", "صورة مؤشر مؤقتة"),
        "#0b6f8c",
        "#142d38"
      ),
      title: pickLocaleText(locale, "Insight Visual", "الصورة الداعمة"),
    };

  res.json({
    found: true,
    insight: {
      id: "ins-temp-001",
      title,
      summary: pickLocaleText(
        locale,
        "Temporary KPI data for validating live fact cards, trends, and supporting visuals.",
        "بيانات مؤشر مؤقتة للتحقق من بطاقات الحقائق المباشرة والاتجاهات والمرئيات الداعمة."
      ),
      headline: {
        label: title,
        value: isPopulationQuery ? pickLocaleText(locale, "5.3 million", "5.3 مليون") : pickLocaleText(locale, "Placeholder KPI", "مؤشر مؤقت"),
        source: "Temporary Local Mock Integration",
      },
      metrics: [
        { label: pickLocaleText(locale, "2022", "2022"), value: 5000000, displayValue: "5.0M" },
        { label: pickLocaleText(locale, "2023", "2023"), value: 5150000, displayValue: "5.15M" },
        { label: pickLocaleText(locale, "2024", "2024"), value: 5300000, displayValue: "5.3M" },
      ],
      chart: {
        title: pickLocaleText(locale, "Illustrative Trend", "اتجاه توضيحي"),
        bars: [
          { label: pickLocaleText(locale, "2022", "2022"), value: 5000000, displayValue: "5.0M" },
          { label: pickLocaleText(locale, "2023", "2023"), value: 5150000, displayValue: "5.15M" },
          { label: pickLocaleText(locale, "2024", "2024"), value: 5300000, displayValue: "5.3M" },
        ],
      },
      highlights: pickLocaleText(
        locale,
        [
          "This is a temporary statistic designed to verify visual KPI rendering.",
          "Replace the endpoint in .env.server to switch from placeholder data to live data.",
        ],
        [
          "هذه إحصائية مؤقتة مخصصة للتحقق من عرض المؤشرات بصرياً.",
          "استبدل نقطة النهاية في .env.server للانتقال من البيانات المؤقتة إلى البيانات الحية.",
        ]
      ),
      images: [insightImage],
      source: "Temporary Local Mock Integration",
    },
  });
});

app.get("/mock-integrations/image-library/search", async (req, res) => {
  const locale = resolveRequestedLocale(req.query?.locale);
  const query =
    typeof req.query?.query === "string" && req.query.query.trim()
      ? req.query.query.trim()
      : pickLocaleText(locale, "Muscat Waterfront", "واجهة مسقط البحرية");

  const localImages = await getLocalImageLibraryItems(query);

  if (!localImages.length) {
    return res.json({
      found: false,
      query,
      images: [],
      summary: pickLocaleText(
        locale,
        "No local images were found in public/demo-image-library. Add PNG, JPG, WEBP, GIF, or AVIF files there and try again.",
        "لم يتم العثور على صور محلية داخل public/demo-image-library. أضف ملفات PNG أو JPG أو WEBP أو GIF أو AVIF هناك ثم أعد المحاولة."
      ),
      source: "Local Folder Image Library",
    });
  }

  res.json({
    found: true,
    title: query,
    summary: pickLocaleText(
      locale,
      "Images loaded from the local demo image library folder.",
      "تم تحميل الصور من مجلد مكتبة الصور المحلية الخاصة بالعرض."
    ),
    images: localImages,
    source: "Local Folder Image Library",
  });
});

app.get("/health", sendHealthPayload);
app.get("/api/health", sendHealthPayload);

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;
  const sessionId = req.body?.sessionId;
  const locale = resolveRequestedLocale(req.body?.locale);
  const useTools = req.body?.useTools !== false;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required." });
  }

  try {
    const result = await fetchOpenAIResponseText(message, sessionId, locale, {
      useTools,
    });
    return res.json({
      output: result.output,
      provider: "openai",
      toolCalls: result.toolCalls,
    });
  } catch (openAIError) {
    console.warn("OpenAI chat failed, trying n8n fallback:", openAIError.message);
  }

  if (!n8nBaseUrl) {
    return res.status(502).json({
      error:
        "OpenAI chat failed and no n8n fallback is configured. Set N8N_API_URL on server.",
    });
  }

  try {
    const fallbackResponse = await fetch(
      `${n8nBaseUrl}/chat?message=${encodeURIComponent(message)}&sessionId=${encodeURIComponent(
        sessionId || "fallback-session"
      )}`
    );

    const payload = await safeJson(fallbackResponse);
    if (!fallbackResponse.ok) {
      const errorMessage = payload?.error || `n8n chat failed (${fallbackResponse.status}).`;
      throw new Error(errorMessage);
    }

    const output = payload?.output;
    if (typeof output !== "string" || !output.trim()) {
      throw new Error("n8n fallback returned empty output.");
    }

    return res.json({ output: output.trim(), provider: "n8n", toolCalls: [] });
  } catch (fallbackError) {
    return res.status(502).json({
      error: `Both OpenAI and n8n chat failed: ${fallbackError.message}`,
    });
  }
});

app.post("/api/tts", async (req, res) => {
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  try {
    await streamOpenAITts(text, res);
    return;
  } catch (openAIError) {
    console.warn("OpenAI TTS failed, trying n8n fallback:", openAIError.message);
  }

  try {
    await streamN8nTts(text, res);
  } catch (fallbackError) {
    res.status(502).json({
      error: `Both OpenAI and n8n TTS failed: ${fallbackError.message}`,
    });
  }
});

app.post("/api/scene-settings", async (req, res) => {
  const settingsPayload = req.body?.settings;

  if (
    !settingsPayload ||
    typeof settingsPayload !== "object" ||
    Array.isArray(settingsPayload)
  ) {
    return res.status(400).json({
      error: "settings (object) is required.",
    });
  }

  try {
    await fs.writeFile(
      SCENE_SETTINGS_FILE_PATH,
      `${JSON.stringify(settingsPayload, null, 2)}\n`,
      "utf8"
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to save scene-settings.json.",
    });
  }
});

app.get("/api/tts", async (req, res) => {
  const message = req.query?.message;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required." });
  }

  try {
    await streamOpenAITts(message, res);
    return;
  } catch (openAIError) {
    console.warn("OpenAI TTS failed, trying n8n fallback:", openAIError.message);
  }

  try {
    await streamN8nTts(message, res);
  } catch (fallbackError) {
    res.status(502).json({
      error: `Both OpenAI and n8n TTS failed: ${fallbackError.message}`,
    });
  }
});

app.post("/api/realtime/session", async (req, res) => {
  if (!openAIApiKey) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY is missing on the backend. Add it to .env.server and restart the server.",
    });
  }

  const requestedModel =
    typeof req.body?.model === "string" && req.body.model.trim()
      ? req.body.model.trim()
      : openAIRealtimeModel;

  const requestedVoice =
    typeof req.body?.voice === "string" && req.body.voice.trim()
      ? req.body.voice.trim()
      : openAITtsVoice;
  const locale = resolveRequestedLocale(req.body?.locale);

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: requestedModel,
        voice: requestedVoice,
        modalities: ["audio", "text"],
        instructions: buildRealtimeInstructions(locale),
        input_audio_transcription: {
          model: openAIRealtimeTranscriptionModel,
        },
      }),
    });

    const payload = await safeJson(response);
    if (!response.ok) {
      const errorMessage =
        payload?.error?.message || "Failed to create OpenAI realtime session.";
      return res.status(response.status).json({ error: errorMessage });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: `Realtime session request failed: ${error.message}`,
    });
  }
});

// ── Seedance AI Video Generation ──────────────────────────────────────────
const seedanceApiKey = (process.env.SEEDANCE_API_KEY || "").trim();
const seedanceApiBaseUrl = (process.env.SEEDANCE_API_BASE_URL || "https://seedanceapi.org").trim();
const seedanceDefaultModel = (process.env.SEEDANCE_MODEL || "seedance-2.0").trim();
const seedanceGeneratePathV1 = (process.env.SEEDANCE_GENERATE_PATH_V1 || "/v1/generate").trim() || "/v1/generate";
const seedanceGeneratePathV2 = (process.env.SEEDANCE_GENERATE_PATH_V2 || "/v2/generate").trim() || "/v2/generate";
const seedanceStatusPathV2 = (process.env.SEEDANCE_STATUS_PATH_V2 || "/v2/status").trim() || "/v2/status";
const seedanceStatusTaskIdParam = (process.env.SEEDANCE_STATUS_TASK_ID_PARAM || "task_id").trim() || "task_id";
const seedanceAuthHeader = (process.env.SEEDANCE_AUTH_HEADER || "Authorization").trim() || "Authorization";
const seedanceAuthPrefix = (process.env.SEEDANCE_AUTH_PREFIX || "Bearer").trim();
const seedanceForceV2 = /^(1|true|yes|on)$/i.test((process.env.SEEDANCE_FORCE_V2 || "false").trim());
const seedanceModelAliasesRaw = (process.env.SEEDANCE_MODEL_ALIASES_JSON || "").trim();
const seedanceGenerateTimeoutMs = Number(process.env.SEEDANCE_GENERATE_TIMEOUT_MS) || 45000;
const seedanceStatusTimeoutMs = Number(process.env.SEEDANCE_STATUS_TIMEOUT_MS) || 20000;
const toorGenSettingsDocPath = (process.env.TOORGEN_SETTINGS_DOC_PATH || "platform_settings/toorgen").trim() || "platform_settings/toorgen";
const toorGenGenerationActiveField = (process.env.TOORGEN_GENERATION_ACTIVE_FIELD || "generation_active").trim() || "generation_active";
const toorGenDefaultGenerationActive = !/^(0|false|no|off)$/i.test((process.env.TOORGEN_DEFAULT_GENERATION_ACTIVE || "true").trim());
const toorGenDailyGenerationsPerUser = Math.max(0, Number(process.env.TOORGEN_DAILY_GENERATIONS_PER_USER || 20));
const toorGenPromptMaxChars = Math.max(1, Number(process.env.TOORGEN_PROMPT_MAX_CHARS || 3000));
const toorGenMaxDurationSec = Math.max(1, Number(process.env.TOORGEN_MAX_DURATION_SEC || 15));
const toorGenMaxReferenceImages = Math.max(0, Number(process.env.TOORGEN_MAX_REFERENCE_IMAGES || 4));

const allowedAspectRatios = new Set(["16:9", "9:16", "4:3", "3:4", "1:1", "21:9", "adaptive"]);
const allowedProviderHints = new Set(["atlas", "byteplus", "grok", "fast", "pro"]);
const baseAllowedModels = ["seedance-2.0", "seedance-2.0-fast", "seedance-1.5", "seedance-1.0", "seedance-1.0-lite", "atlas-2.0"];

const parseModelAliases = (rawValue) => {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key, value]) => typeof key === "string" && typeof value === "string")
        .map(([key, value]) => [key.trim().toLowerCase(), value.trim()]),
    );
  } catch {
    return {};
  }
};

const seedanceModelAliases = parseModelAliases(seedanceModelAliasesRaw);
const allowedModels = new Set(baseAllowedModels.map((model) => model.toLowerCase()));
Object.keys(seedanceModelAliases).forEach((model) => {
  if (typeof model === "string" && model.trim()) {
    allowedModels.add(model.trim().toLowerCase());
  }
});
Object.values(seedanceModelAliases).forEach((model) => {
  if (typeof model === "string" && model.trim()) {
    allowedModels.add(model.trim().toLowerCase());
  }
});
let platformDbPromise = null;

const getPlatformDb = async () => {
  if (!platformDbPromise) {
    platformDbPromise = ensurePlatformFirebaseAdminApp().then((app) => getFirestore(app));
  }
  return platformDbPromise;
};

const normalizeUpstreamPath = (value, fallback) => {
  const raw = (value || fallback || "").trim() || fallback;
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const buildUpstreamUrl = (routePath) => {
  const base = seedanceApiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = normalizeUpstreamPath(routePath, "/");
  return `${base}${normalizedPath}`;
};

const buildSeedanceAuthHeaders = (includeJsonContentType = false) => {
  const token = seedanceAuthPrefix ? `${seedanceAuthPrefix} ${seedanceApiKey}`.trim() : seedanceApiKey;
  const headers = {
    [seedanceAuthHeader]: token,
  };
  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

const seedanceReferenceDir = path.resolve(process.cwd(), "server", "seedance-references");
(async () => { try { await fs.mkdir(seedanceReferenceDir, { recursive: true }); } catch {} })();

const isAbortTimeoutError = (error) =>
  Boolean(error && (error.name === "AbortError" || String(error.message || "").toLowerCase().includes("aborted")));

const fetchWithTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const normalizeSeedanceModel = (model) => {
  const valid = ["seedance-2.0", "seedance-2.0-fast", "seedance-1.5", "seedance-1.0", "seedance-1.0-lite"];
  const raw = (model || "").trim().toLowerCase();
  return valid.includes(raw) ? raw : seedanceDefaultModel;
};

const resolveUpstreamSeedanceModel = (normalizedModel) => {
  const alias = seedanceModelAliases[String(normalizedModel || "").trim().toLowerCase()];
  if (typeof alias === "string" && alias.trim()) {
    return alias.trim();
  }
  return normalizedModel;
};

const buildSeedanceStatusUrl = (taskId) => {
  const statusPath = normalizeUpstreamPath(seedanceStatusPathV2, "/v2/status");
  if (statusPath.includes("{task_id}")) {
    return buildUpstreamUrl(statusPath.replace("{task_id}", encodeURIComponent(taskId)));
  }

  const statusUrl = new URL(buildUpstreamUrl(statusPath));
  statusUrl.searchParams.set(seedanceStatusTaskIdParam, taskId);
  return statusUrl.toString();
};

const normalizeReferenceImages = (payload) => {
  if (Array.isArray(payload?.images)) {
    return payload.images;
  }
  if (Array.isArray(payload?.image_urls)) {
    return payload.image_urls;
  }
  return [];
};

const getUtcDayKey = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const checkGenerationIsActive = async () => {
  try {
    const db = await getPlatformDb();
    const settingsDoc = await db.doc(toorGenSettingsDocPath).get();
    const configuredValue = settingsDoc.exists ? settingsDoc.get(toorGenGenerationActiveField) : undefined;
    if (typeof configuredValue === "boolean") {
      return configuredValue;
    }
    return toorGenDefaultGenerationActive;
  } catch {
    return toorGenDefaultGenerationActive;
  }
};

const reserveDailyGenerationQuota = async (uid) => {
  if (!uid || typeof uid !== "string") {
    return { ok: false, status: 401, error: "Missing authenticated user ID." };
  }

  if (toorGenDailyGenerationsPerUser <= 0) {
    return { ok: true, count: 0, limit: 0 };
  }

  const dayKey = getUtcDayKey();
  const db = await getPlatformDb();
  const usageRef = db.collection("toorgen_usage_daily").doc(`${uid}_${dayKey}`);

  try {
    let nextCount = 0;
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(usageRef);
      const currentCount = snapshot.exists ? Number(snapshot.get("count") || 0) : 0;
      if (currentCount >= toorGenDailyGenerationsPerUser) {
        throw new Error("DAILY_LIMIT_REACHED");
      }
      nextCount = currentCount + 1;
      tx.set(
        usageRef,
        {
          uid,
          dayKey,
          count: nextCount,
          limit: toorGenDailyGenerationsPerUser,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return { ok: true, count: nextCount, limit: toorGenDailyGenerationsPerUser };
  } catch (error) {
    if (String(error?.message || "").includes("DAILY_LIMIT_REACHED")) {
      return {
        ok: false,
        status: 429,
        error: `Daily generation limit reached (${toorGenDailyGenerationsPerUser}).`,
      };
    }

    return {
      ok: false,
      status: 503,
      error: "Usage limit system temporarily unavailable.",
    };
  }
};

const validateGenerationRequest = (payload, uid) => {
  if (!uid || typeof uid !== "string") {
    return { ok: false, status: 401, error: "Missing authenticated user ID." };
  }

  const prompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt) {
    return { ok: false, status: 400, error: "prompt is required." };
  }
  if (prompt.length > toorGenPromptMaxChars) {
    return { ok: false, status: 400, error: `prompt exceeds maximum length of ${toorGenPromptMaxChars} characters.` };
  }

  const duration = Number(payload?.duration);
  const normalizedDuration = Number.isFinite(duration) && duration > 0 ? duration : 5;
  if (normalizedDuration > toorGenMaxDurationSec) {
    return { ok: false, status: 400, error: `duration exceeds maximum of ${toorGenMaxDurationSec} seconds.` };
  }

  const aspectRatio = typeof payload?.aspect_ratio === "string" ? payload.aspect_ratio.trim() : "16:9";
  if (!allowedAspectRatios.has(aspectRatio)) {
    return {
      ok: false,
      status: 400,
      error: `aspect_ratio must be one of: ${Array.from(allowedAspectRatios).join(", ")}.`,
    };
  }

  const model = typeof payload?.model === "string" && payload.model.trim()
    ? payload.model.trim()
    : seedanceDefaultModel;
  if (!allowedModels.has(model.toLowerCase())) {
    return { ok: false, status: 400, error: "model is not allowed." };
  }

  const providerHint = typeof payload?.providerHint === "string" ? payload.providerHint.trim().toLowerCase() : "";
  if (providerHint && !allowedProviderHints.has(providerHint)) {
    return { ok: false, status: 400, error: "providerHint is not allowed." };
  }

  const rawImageInputs = normalizeReferenceImages(payload);
  if (rawImageInputs.length > toorGenMaxReferenceImages) {
    return {
      ok: false,
      status: 400,
      error: `reference image count exceeds maximum of ${toorGenMaxReferenceImages}.`,
    };
  }

  return {
    ok: true,
    value: {
      prompt,
      duration: normalizedDuration,
      aspect_ratio: aspectRatio,
      model,
      images: rawImageInputs,
      image_urls: rawImageInputs,
    },
  };
};

const sanitizeReferenceFileName = (name) => {
  if (typeof name !== "string") return null;
  const clean = path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, "_");
  if (!clean || clean === "." || clean === "..") return null;
  return clean;
};

const verifyFirebaseAuth = createFirebaseAuthVerifier({
  ensureFirebaseAdminApp: ensurePlatformFirebaseAdminApp,
  getAuth,
});

const requireAuth = async (req, res, next) => {
  const result = await verifyFirebaseAuth(req);
  if (!result.ok) {
    return res.status(result.status || 401).json({ error: result.error || "Unauthorized" });
  }
  req.user = result;
  next();
};

const resolveImageForSeedance = async (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) return null;
  const localPrefix = "/api/seedance/reference-image/";
  if (imageUrl.startsWith(localPrefix)) {
    // If we have a local base URL configured (e.g. tunneling like ngrok or public IP),
    // use it to provide a public URL to Seedance instead of base64.
    const chatbotPublicUrl = (process.env.VITE_CHATBOT_LOCAL_URL || "").trim().replace(/\/$/, "");
    if (chatbotPublicUrl && chatbotPublicUrl.startsWith("http")) {
      return `${chatbotPublicUrl}${imageUrl}`;
    }

    const rawName = decodeURIComponent(imageUrl.slice(localPrefix.length));
    const fileName = sanitizeReferenceFileName(rawName);
    if (!fileName) return null;
    try {
      const filePath = path.join(seedanceReferenceDir, fileName);
      const data = await fs.readFile(filePath);
      const ext = path.extname(fileName).toLowerCase();
      const mime = ext === ".png" ? "image/png"
        : ext === ".webp" ? "image/webp"
        : ext === ".gif" ? "image/gif" : "image/jpeg";
      return `data:${mime};base64,${data.toString("base64")}`;
    } catch { return null; }
  }
  if (imageUrl.startsWith("data:image/")) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return null;
};

const handleSeedanceGenerate = async (req, res) => {
  if (!seedanceApiKey) {
    return res.status(503).json({ error: "Seedance API key not configured on server." });
  }

  const isGenerationActive = await checkGenerationIsActive();
  if (!isGenerationActive) {
    return res.status(503).json({ error: "Service Temporarily Paused" });
  }

  const validation = validateGenerationRequest(req.body || {}, req.user?.uid);
  if (!validation.ok) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const quotaReservation = await reserveDailyGenerationQuota(req.user?.uid);
  if (!quotaReservation.ok) {
    return res.status(quotaReservation.status).json({ error: quotaReservation.error });
  }

  const { prompt, duration, aspect_ratio, model, images, image_urls } = validation.value;

  try {
    const rawImageInputs = Array.isArray(images) ? images : (Array.isArray(image_urls) ? image_urls : []);
    const imageInputs = (await Promise.all(rawImageInputs.map(resolveImageForSeedance))).filter(Boolean);
    const requestedModel = normalizeSeedanceModel(model);
    const upstreamModel = resolveUpstreamSeedanceModel(requestedModel);
    const generateV1Path = normalizeUpstreamPath(seedanceGeneratePathV1, "/v1/generate");
    const generateV2Path = normalizeUpstreamPath(seedanceGeneratePathV2, "/v2/generate");

    // Seedance 1.5 uses the v1 endpoint with different parameters
    if (!seedanceForceV2 && requestedModel === "seedance-1.5") {
      const validV1Durations = ["4", "8", "12"];
      const rawDuration = String(Number(duration) || 8);
      const v1Duration = validV1Durations.includes(rawDuration) ? rawDuration : "8";
      const v1Body = {
        prompt: prompt.trim(),
        duration: v1Duration,
        aspect_ratio: aspect_ratio || "16:9",
        resolution: "720p",
      };
      if (imageInputs.length > 0) v1Body.image_urls = imageInputs.slice(0, 1);
      const upstream = await fetchWithTimeout(
        buildUpstreamUrl(generateV1Path),
        { method: "POST", headers: buildSeedanceAuthHeaders(true), body: JSON.stringify(v1Body) },
        seedanceGenerateTimeoutMs,
      );
      const data = await parseUpstreamBody(upstream);
      return res.status(upstream.status).json(data);
    }

    const body = {
      model: upstreamModel,
      prompt: prompt.trim(),
      duration: Number(duration) || 5,
      aspect_ratio: aspect_ratio || "16:9",
    };
    if (imageInputs.length > 0) body.images = imageInputs;
    const upstream = await fetchWithTimeout(
      buildUpstreamUrl(generateV2Path),
      { method: "POST", headers: buildSeedanceAuthHeaders(true), body: JSON.stringify(body) },
      seedanceGenerateTimeoutMs,
    );
    const data = await parseUpstreamBody(upstream);
    return res.status(upstream.status).json(data);
  } catch (error) {
    if (isAbortTimeoutError(error)) {
      return res.status(504).json({ error: `Seedance generate timed out after ${seedanceGenerateTimeoutMs / 1000}s.` });
    }
    return res.status(500).json({ error: error?.message || "Seedance generate failed." });
  }
};

app.post("/api/seedance/generate", requireAuth, handleSeedanceGenerate);
app.post("/api/byteplus/generate", requireAuth, handleSeedanceGenerate);

const handleSeedanceStatus = async (req, res) => {
  if (!seedanceApiKey) {
    return res.status(503).json({ error: "Seedance API key not configured on server." });
  }

  const isGenerationActive = await checkGenerationIsActive();
  if (!isGenerationActive) {
    return res.status(503).json({ error: "Service Temporarily Paused" });
  }

  const taskId = req.query?.task_id;
  if (!taskId || typeof taskId !== "string") {
    return res.status(400).json({ error: "task_id is required." });
  }
  try {
    const upstream = await fetchWithTimeout(
      buildSeedanceStatusUrl(taskId),
      { headers: buildSeedanceAuthHeaders(false) },
      seedanceStatusTimeoutMs,
    );
    const data = await parseUpstreamBody(upstream);
    return res.status(upstream.status).json(data);
  } catch (error) {
    if (isAbortTimeoutError(error)) {
      return res.status(504).json({ error: `Seedance status check timed out after ${seedanceStatusTimeoutMs / 1000}s.` });
    }
    return res.status(500).json({ error: error?.message || "Seedance status failed." });
  }
};

app.get("/api/seedance/status", requireAuth, handleSeedanceStatus);
app.get("/api/byteplus/status", requireAuth, handleSeedanceStatus);

app.post("/api/seedance/reference-image", requireAuth, async (req, res) => {
  try {
    const rawName = decodeURIComponent(req.headers["x-file-name"] || "reference-image.jpg");
    const ext = path.extname(rawName) || ".jpg";
    const safeName = sanitizeReferenceFileName(path.basename(rawName, ext));
    if (!safeName) return res.status(400).json({ error: "Invalid file name." });
    const suffix = randomBytes(6).toString("base64url");
    const shortId = randomBytes(4).toString("base64url");
    const fileName = `${safeName}-${suffix}-${shortId}${ext}`;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) return res.status(400).json({ error: "Empty file body." });
    if (buffer.length > 20 * 1024 * 1024) return res.status(413).json({ error: "File exceeds 20 MB limit." });
    const filePath = path.join(seedanceReferenceDir, fileName);
    await fs.writeFile(filePath, buffer);
    return res.json({ ok: true, fileName, url: `/api/seedance/reference-image/${encodeURIComponent(fileName)}` });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Reference image upload failed." });
  }
});

app.get("/api/seedance/reference-image/:fileName", async (req, res) => {
  // Express already URL-decodes route params; do not call decodeURIComponent again
  // or stored filenames containing encoded chars would double-decode to wrong paths.
  const fileName = sanitizeReferenceFileName(req.params.fileName || "");
  if (!fileName) return res.status(400).json({ error: "Invalid file name." });
  try {
    const filePath = path.join(seedanceReferenceDir, fileName);
    const data = await fs.readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mime = ext === ".png" ? "image/png"
      : ext === ".webp" ? "image/webp"
      : ext === ".gif" ? "image/gif"
      : ext === ".avif" ? "image/avif"
      : "image/jpeg";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=86400");
    return res.send(data);
  } catch {
    return res.status(404).json({ error: "Reference image not found." });
  }
});
// Only start the HTTP server when this file is run directly (e.g. `node server/index.js`).
// When imported by the Firebase Functions wrapper or the CLI analyser, skip app.listen.
import { fileURLToPath } from "url";
const isDirectEntry =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    process.argv[1].replace(/\\/g, "/");

if (isDirectEntry) {
  app.listen(port, () => {
    console.log(`Backend proxy running on http://localhost:${port}`);
  });
}

export { app };

app.post("/api/chat/stream", async (req, res) => {
  const message = req.body?.message;
  const sessionId = req.body?.sessionId;
  const locale = resolveRequestedLocale(req.body?.locale);
  const useTools = req.body?.useTools !== false;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required." });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Connection", "keep-alive");

  const writeEvent = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  const writeTokenizedOutput = (outputText) => {
    for (const token of tokenizeTextForStreaming(outputText)) {
      writeEvent({ type: "delta", delta: token });
    }
  };

  try {
    if (useTools) {
      const toolResult = await fetchOpenAIResponseText(message, sessionId, locale, {
        useTools: true,
      });
      writeTokenizedOutput(toolResult.output);
      writeEvent({
        type: "done",
        output: toolResult.output,
        toolCalls: toolResult.toolCalls,
        provider: "openai",
      });
      res.end();
      return;
    }

    const streamedResult = await streamOpenAIResponseTextNoTools(
      message,
      sessionId,
      locale,
      (delta) => {
        writeEvent({ type: "delta", delta });
      }
    );

    writeEvent({
      type: "done",
      output: streamedResult.output,
      toolCalls: streamedResult.toolCalls,
      provider: "openai",
    });
    res.end();
    return;
  } catch (openAIError) {
    console.warn("OpenAI chat stream failed, trying n8n fallback:", openAIError.message);
  }

  if (!n8nBaseUrl) {
    writeEvent({
      type: "error",
      error:
        "OpenAI chat failed and no n8n fallback is configured. Set N8N_API_URL on server.",
    });
    res.end();
    return;
  }

  try {
    const fallbackResponse = await fetch(
      `${n8nBaseUrl}/chat?message=${encodeURIComponent(message)}&sessionId=${encodeURIComponent(
        sessionId || "fallback-session"
      )}`
    );

    const payload = await safeJson(fallbackResponse);
    if (!fallbackResponse.ok) {
      const errorMessage = payload?.error || `n8n chat failed (${fallbackResponse.status}).`;
      throw new Error(errorMessage);
    }

    const output = payload?.output;
    if (typeof output !== "string" || !output.trim()) {
      throw new Error("n8n fallback returned empty output.");
    }

    writeTokenizedOutput(output.trim());
    writeEvent({
      type: "done",
      output: output.trim(),
      toolCalls: [],
      provider: "n8n",
    });
    res.end();
  } catch (fallbackError) {
    writeEvent({
      type: "error",
      error: `Both OpenAI and n8n chat failed: ${fallbackError.message}`,
    });
    res.end();
  }
});