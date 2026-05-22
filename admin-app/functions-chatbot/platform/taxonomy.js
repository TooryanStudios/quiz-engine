export const PLATFORM_TAXONOMY_VERSION = "2026-05-22";

export const PLATFORM_MAJOR_CATEGORIES = [
  {
    name: "Image Generation",
    description: "Create and transform static visual assets.",
    minorCategories: [
      "Text-to-Image",
      "Image-to-Image",
      "Image Editing",
      "Image Quality Improvement",
      "Avatar & Character Image Creation",
      "Product & Commercial Visuals",
      "3D & Asset Creation",
    ],
  },
  {
    name: "Video Generation",
    description: "Plan, generate, transform, and optimize videos.",
    minorCategories: [
      "Text-to-Video",
      "Image-to-Video",
      "Video-to-Video",
      "Video Planning & Pre-Production",
      "Cinematic & Film Production",
      "Marketing & Social Video",
      "Avatar & Presenter Video",
      "Video Localization",
      "Video Enhancement",
      "Video Extraction & Repurposing",
    ],
  },
  {
    name: "Audio & Voice Generation",
    description: "Generate, transform, and clean spoken audio and sound.",
    minorCategories: [
      "Text-to-Speech",
      "Voice Creation & Transformation",
      "Dubbing & Localization",
      "Podcast & Spoken Content",
      "Music & Sound Generation",
      "Audio Cleanup & Enhancement",
      "Voice Agents & Conversational Audio",
    ],
  },
  {
    name: "Text Generation",
    description: "Generate scripts, marketing text, and knowledge outputs.",
    minorCategories: [
      "Script & Story Writing",
      "Marketing Copy",
      "Social Media Content",
      "Long-Form Content",
      "Prompt & Creative Direction",
      "Translation & Localization",
      "Business & Knowledge Writing",
      "Ideation",
    ],
  },
  {
    name: "Smart Business, Creator & Studio Workflow",
    description: "Orchestrate campaign workflows, governance, and team operations.",
    minorCategories: [
      "Campaign Generation",
      "Brand & Memory Systems",
      "Creative Direction & Optimization",
      "Team & Client Workflow",
      "Publishing & Export",
      "Governance, Compliance & Rights",
      "Automation & Model Infrastructure",
    ],
  },
];

const taxonomyByName = new Map(
  PLATFORM_MAJOR_CATEGORIES.map((entry) => [entry.name.toLowerCase(), entry])
);

export const getMajorCategory = (name) => {
  const normalized = String(name || "").trim().toLowerCase();
  return taxonomyByName.get(normalized) || null;
};

export const getTaxonomySnapshot = () => ({
  version: PLATFORM_TAXONOMY_VERSION,
  categories: PLATFORM_MAJOR_CATEGORIES,
});
