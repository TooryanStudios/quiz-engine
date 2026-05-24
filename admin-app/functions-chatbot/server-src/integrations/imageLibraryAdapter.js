import { fetchJsonFromIntegration } from "./httpJsonClient.js";

const normalizeImages = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (typeof entry === "string" && entry.trim()) {
        return {
          src: entry.trim(),
          alt: `Image ${index + 1}`,
          title: `Image ${index + 1}`,
        };
      }

      if (!entry || typeof entry !== "object") {
        return null;
      }

      const src = entry.src || entry.url || entry.image || entry.thumbnailUrl;
      if (!src || typeof src !== "string") {
        return null;
      }

      return {
        src,
        alt: entry.alt || entry.title || `Image ${index + 1}`,
        title: entry.title || entry.caption || `Image ${index + 1}`,
      };
    })
    .filter(Boolean);
};

const normalizeImageLibraryResponse = (payload, query) => {
  if (!payload) {
    return {
      found: false,
      query,
      images: [],
    };
  }

  const images = normalizeImages(
    payload.images || payload.items || payload.results || payload.data
  );

  if (!images.length) {
    return {
      found: typeof payload.found === "boolean" ? payload.found : false,
      query,
      images: [],
    };
  }

  return {
    found: true,
    query,
    images,
    presentation: {
      title: payload.title || query,
      summary:
        payload.summary ||
        payload.description ||
        `Image results for ${query}`,
      images,
      source: payload.source || "",
    },
  };
};

export const createImageLibraryAdapter = ({ lookupUrl, apiKey, bearerToken, timeoutMs }) => ({
  isConfigured: Boolean(lookupUrl),
  async searchImages({ query, locale }) {
    if (!lookupUrl) {
      throw new Error(
        "Image library integration is not configured. Set IMAGE_LIBRARY_URL in .env.server."
      );
    }

    const payload = await fetchJsonFromIntegration(lookupUrl, {
      method: "GET",
      query: { query, locale },
      apiKey,
      bearerToken,
      timeoutMs,
    });

    return normalizeImageLibraryResponse(payload, query);
  },
});