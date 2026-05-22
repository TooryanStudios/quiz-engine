const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();

const coerceInputType = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return "unknown";
  if (normalized.includes("image") || normalized.includes("photo")) return "image";
  if (normalized.includes("video")) return "video";
  if (normalized.includes("audio") || normalized.includes("voice") || normalized.includes("speech")) return "audio";
  if (normalized.includes("pdf") || normalized.includes("doc") || normalized.includes("text")) return "document";
  return normalized;
};

const extractInputType = (entry) => {
  if (!entry || typeof entry !== "object") {
    return "unknown";
  }

  const byType = coerceInputType(entry.type || entry.kind || entry.inputType);
  if (byType !== "unknown") {
    return byType;
  }

  const mimeType = String(entry.mimeType || entry.contentType || "").toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.startsWith("text/")) return "document";

  const url = String(entry.url || entry.sourceUrl || "").toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif|avif)$/.test(url)) return "image";
  if (/\.(mp4|mov|webm|mkv)$/.test(url)) return "video";
  if (/\.(mp3|wav|aac|m4a)$/.test(url)) return "audio";
  if (/\.(pdf|txt|md|doc|docx)$/.test(url)) return "document";

  return "unknown";
};

const buildIntentSummary = ({ goal, prompt, requestedOutputType, inputTypes }) => {
  const goalLine = goal ? `Goal: ${goal}.` : "Goal: not explicitly provided.";
  const promptLine = prompt ? `Prompt: ${prompt}.` : "Prompt: not explicitly provided.";
  const outputLine = requestedOutputType
    ? `Requested output: ${requestedOutputType}.`
    : "Requested output: not explicitly provided.";
  const inputLine = inputTypes.length
    ? `Detected input types: ${inputTypes.join(", ")}.`
    : "Detected input types: none provided.";

  return `${goalLine} ${promptLine} ${outputLine} ${inputLine}`;
};

export const analyzePlatformRequestContext = (payload) => {
  const goal = normalizeWhitespace(payload?.goal || payload?.businessGoal);
  const prompt = normalizeWhitespace(payload?.prompt || payload?.request || payload?.brief);
  const requestedOutputType = normalizeWhitespace(payload?.requestedOutputType || payload?.outputType);
  const inputs = Array.isArray(payload?.inputs) ? payload.inputs : [];

  const inputTypes = Array.from(new Set(inputs.map(extractInputType).filter(Boolean))).filter(
    (value) => value !== "unknown"
  );

  const combinedText = `${goal} ${prompt} ${requestedOutputType}`.toLowerCase();
  const signals = {
    hasCampaignSignal: /campaign|launch|ad|marketing|promo|promotion/.test(combinedText),
    hasStoryboardSignal: /storyboard|shot list|scene/.test(combinedText),
    hasLocalizationSignal: /localiz|dub|subtitle|caption|translate/.test(combinedText),
    hasAvatarSignal: /avatar|presenter|talking head|lipsync/.test(combinedText),
    hasComplianceSignal: /compliance|policy|rights|consent|legal/.test(combinedText),
  };

  return {
    goal,
    prompt,
    requestedOutputType,
    inputTypes,
    signals,
    intentSummary: buildIntentSummary({ goal, prompt, requestedOutputType, inputTypes }),
  };
};

const RAG_RETRIEVAL_PROFILES = {
  "Video Generation": [
    "brand_guidelines",
    "product_descriptions",
    "campaign_briefs",
    "storyboards",
    "previous_video_assets",
  ],
  "Image Generation": [
    "brand_visuals",
    "product_references",
    "character_bible",
    "style_guides",
  ],
  "Audio & Voice Generation": [
    "scripts",
    "pronunciation_guides",
    "voice_rules",
    "consent_records",
  ],
  "Text Generation": [
    "brand_voice",
    "research_notes",
    "meeting_summaries",
    "compliance_guidelines",
  ],
  "Smart Business, Creator & Studio Workflow": [
    "campaign_calendars",
    "approval_history",
    "analytics",
    "rights_and_consent",
  ],
};

export const buildCategorySpecificRagPlan = (classification) => {
  const major = classification?.majorCategory || "Text Generation";
  const retrievalSources = RAG_RETRIEVAL_PROFILES[major] || RAG_RETRIEVAL_PROFILES["Text Generation"];

  return {
    majorCategory: major,
    retrievalSources,
    requiredFilters: [
      "tenantId",
      "workspaceId",
      "projectId",
      "majorCategory",
      "minorCategory",
      "subCategory",
      "permissions",
    ],
  };
};

export const buildCategorySpecificPromptPlan = ({ context, classification }) => {
  const major = classification?.majorCategory || "Text Generation";
  const promptBlocks = [
    "task_goal",
    "audience_and_context",
    "safety_and_policy_constraints",
    "output_format",
  ];

  if (major === "Video Generation") {
    promptBlocks.push("scene_structure", "camera_and_motion", "pacing", "cta");
  }

  if (major === "Image Generation") {
    promptBlocks.push("visual_style", "composition", "lighting");
  }

  if (major === "Audio & Voice Generation") {
    promptBlocks.push("voice_style", "language_and_accent", "timing_and_delivery");
  }

  return {
    majorCategory: major,
    minorCategory: classification?.minorCategory || "Unspecified",
    subCategory: classification?.subCategory || "Unspecified",
    promptBlocks,
    normalizedIntentSummary: context?.intentSummary || "",
  };
};
