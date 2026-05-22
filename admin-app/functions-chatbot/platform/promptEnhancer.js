import {
  analyzePlatformRequestContext,
  buildCategorySpecificPromptPlan,
} from "./contextAnalysis.js";
import { classifyPlatformRequest } from "./classifier.js";

const normalizePayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  return {
    goal: String(body.goal || "").trim(),
    prompt: String(body.prompt || "").trim(),
    requestedOutputType: String(body.requestedOutputType || body.outputType || "").trim(),
    inputs: Array.isArray(body.inputs) ? body.inputs : [],
  };
};

const toSection = (title, value) => {
  if (!value) {
    return "";
  }
  return `${title}: ${value}`;
};

const renderVideoTemplate = ({ context }) => {
  const requestedOutput = context.requestedOutputType || "short marketing video";
  return [
    toSection("Goal", context.goal || "Create a clear conversion-focused video"),
    toSection("Audience", "Define audience segment and problem context"),
    toSection("Output", requestedOutput),
    toSection("Hook", "Open with the user pain point in first 2 seconds"),
    toSection("Scene Plan", "Scene 1 hook, Scene 2 product value, Scene 3 proof, Scene 4 CTA"),
    toSection("Camera", "Include cinematic movement, framing, and transitions"),
    toSection("Visual Style", "Specify lighting, color direction, and pacing"),
    toSection("CTA", "End with one clear action and platform-appropriate format"),
  ]
    .filter(Boolean)
    .join("\n");
};

const renderGenericTemplate = ({ context, classification, promptPlan }) => {
  return [
    toSection("Goal", context.goal || "Not provided"),
    toSection("User Prompt", context.prompt || "Not provided"),
    toSection("Major Category", classification.majorCategory),
    toSection("Minor Category", classification.minorCategory),
    toSection("Sub Category", classification.subCategory),
    toSection("Prompt Blocks", promptPlan.promptBlocks.join(", ")),
  ]
    .filter(Boolean)
    .join("\n");
};

export const generateEnhancedPrompt = (payload) => {
  const normalized = normalizePayload(payload);
  const context = analyzePlatformRequestContext(normalized);
  const classification = classifyPlatformRequest({ context });
  const promptPlan = buildCategorySpecificPromptPlan({
    context,
    classification,
  });

  const enhancedPrompt = classification.majorCategory === "Video Generation"
    ? renderVideoTemplate({ context, classification, promptPlan })
    : renderGenericTemplate({ context, classification, promptPlan });

  return {
    context,
    classification,
    promptPlan,
    enhancedPrompt,
  };
};
