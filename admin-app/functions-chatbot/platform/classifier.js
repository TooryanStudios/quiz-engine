const includesAny = (value, needles) => needles.some((needle) => value.includes(needle));

const toLowerText = (...parts) => parts.filter(Boolean).join(" ").toLowerCase();

const classifyVideo = ({ text, inputTypes }) => {
  if (includesAny(text, ["storyboard", "shot list", "pre-production"])) {
    return {
      majorCategory: "Video Generation",
      minorCategory: "Video Planning & Pre-Production",
      subCategory: "Storyboarding",
      confidence: 0.9,
      workflowType: "video_planning",
    };
  }

  if (includesAny(text, ["avatar", "presenter", "lipsync", "talking"])) {
    return {
      majorCategory: "Video Generation",
      minorCategory: "Avatar & Presenter Video",
      subCategory: "Talking Avatars",
      confidence: 0.9,
      workflowType: "avatar_video",
    };
  }

  if (inputTypes.includes("image")) {
    return {
      majorCategory: "Video Generation",
      minorCategory: "Image-to-Video",
      subCategory: includesAny(text, ["product", "demo", "showcase"])
        ? "Product Demo Videos"
        : "Image-to-Video",
      confidence: 0.86,
      workflowType: "image_to_video",
    };
  }

  if (inputTypes.includes("video")) {
    return {
      majorCategory: "Video Generation",
      minorCategory: "Video-to-Video",
      subCategory: "AI Video Editing",
      confidence: 0.84,
      workflowType: "video_to_video",
    };
  }

  if (includesAny(text, ["ad", "commercial", "promo", "social", "reel"])) {
    return {
      majorCategory: "Video Generation",
      minorCategory: "Marketing & Social Video",
      subCategory: "Commercial & Ad Videos",
      confidence: 0.88,
      workflowType: "marketing_video",
    };
  }

  return {
    majorCategory: "Video Generation",
    minorCategory: "Text-to-Video",
    subCategory: "Text-to-Video",
    confidence: 0.8,
    workflowType: "text_to_video",
  };
};

const classifyImage = ({ text, inputTypes }) => {
  if (inputTypes.includes("image") && includesAny(text, ["edit", "inpaint", "background", "remove"])) {
    return {
      majorCategory: "Image Generation",
      minorCategory: "Image Editing",
      subCategory: "Image Editing & Inpaint",
      confidence: 0.87,
      workflowType: "image_editing",
    };
  }

  if (inputTypes.includes("image")) {
    return {
      majorCategory: "Image Generation",
      minorCategory: "Image-to-Image",
      subCategory: "Image-to-Image Generation",
      confidence: 0.84,
      workflowType: "image_to_image",
    };
  }

  return {
    majorCategory: "Image Generation",
    minorCategory: "Text-to-Image",
    subCategory: "Text-to-Image Generation",
    confidence: 0.82,
    workflowType: "text_to_image",
  };
};

const classifyAudio = ({ text }) => {
  if (includesAny(text, ["dub", "dubbing", "localiz", "translate", "subtitle"])) {
    return {
      majorCategory: "Audio & Voice Generation",
      minorCategory: "Dubbing & Localization",
      subCategory: "AI Dubbing",
      confidence: 0.88,
      workflowType: "audio_localization",
    };
  }

  if (includesAny(text, ["cleanup", "noise", "master", "isolate", "stem"])) {
    return {
      majorCategory: "Audio & Voice Generation",
      minorCategory: "Audio Cleanup & Enhancement",
      subCategory: "Audio Cleanup",
      confidence: 0.87,
      workflowType: "audio_cleanup",
    };
  }

  return {
    majorCategory: "Audio & Voice Generation",
    minorCategory: "Text-to-Speech",
    subCategory: "Voice Generation",
    confidence: 0.81,
    workflowType: "text_to_speech",
  };
};

const classifyBusinessWorkflow = ({ text }) => {
  if (includesAny(text, ["compliance", "rights", "consent", "policy", "legal"])) {
    return {
      majorCategory: "Smart Business, Creator & Studio Workflow",
      minorCategory: "Governance, Compliance & Rights",
      subCategory: "Compliance Review",
      confidence: 0.89,
      workflowType: "compliance_review",
    };
  }

  if (includesAny(text, ["campaign", "calendar", "launch"])) {
    return {
      majorCategory: "Smart Business, Creator & Studio Workflow",
      minorCategory: "Campaign Generation",
      subCategory: "One-Prompt Campaign Generator",
      confidence: 0.86,
      workflowType: "campaign_generation",
    };
  }

  return {
    majorCategory: "Smart Business, Creator & Studio Workflow",
    minorCategory: "Automation & Model Infrastructure",
    subCategory: "Multi-Model Router",
    confidence: 0.78,
    workflowType: "workflow_automation",
  };
};

const classifyText = ({ text }) => {
  if (includesAny(text, ["script", "story", "dialogue"])) {
    return {
      majorCategory: "Text Generation",
      minorCategory: "Script & Story Writing",
      subCategory: "Script Writing",
      confidence: 0.85,
      workflowType: "script_generation",
    };
  }

  if (includesAny(text, ["email", "landing page", "copy", "cta", "product description"])) {
    return {
      majorCategory: "Text Generation",
      minorCategory: "Marketing Copy",
      subCategory: "Copywriting",
      confidence: 0.84,
      workflowType: "marketing_copy",
    };
  }

  return {
    majorCategory: "Text Generation",
    minorCategory: "Prompt & Creative Direction",
    subCategory: "Prompt Generation",
    confidence: 0.76,
    workflowType: "prompt_generation",
  };
};

export const classifyPlatformRequest = ({ context }) => {
  const text = toLowerText(context?.goal, context?.prompt, context?.requestedOutputType);
  const inputTypes = Array.isArray(context?.inputTypes) ? context.inputTypes : [];

  const requestsVideo = includesAny(text, ["video", "reel", "short", "clip", "scene", "storyboard"]);
  const requestsImage = includesAny(text, ["image", "photo", "visual", "thumbnail", "poster"]);
  const requestsAudio = includesAny(text, ["audio", "voice", "speech", "podcast", "tts", "music"]);
  const requestsBusinessWorkflow = includesAny(text, [
    "campaign",
    "compliance",
    "rights",
    "consent",
    "team",
    "approval",
    "workflow",
    "automation",
  ]);

  if (requestsVideo || inputTypes.includes("video")) {
    return classifyVideo({ text, inputTypes });
  }

  if (requestsImage || inputTypes.includes("image")) {
    return classifyImage({ text, inputTypes });
  }

  if (requestsAudio || inputTypes.includes("audio")) {
    return classifyAudio({ text });
  }

  if (requestsBusinessWorkflow) {
    return classifyBusinessWorkflow({ text });
  }

  return classifyText({ text });
};
