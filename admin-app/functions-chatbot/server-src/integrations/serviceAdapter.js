import { fetchJsonFromIntegration } from "./httpJsonClient.js";

const firstArrayItem = (value) => (Array.isArray(value) ? value[0] || null : null);

const normalizeServiceResponse = (payload, query) => {
  if (!payload) {
    return {
      found: false,
      query,
      suggestions: [],
    };
  }

  if (typeof payload.found === "boolean") {
    return payload;
  }

  const directService = payload.service || payload.result || payload.item;
  if (directService && typeof directService === "object") {
    return {
      found: true,
      query,
      service: directService,
    };
  }

  const listMatch =
    firstArrayItem(payload.services) ||
    firstArrayItem(payload.results) ||
    firstArrayItem(payload.items) ||
    firstArrayItem(payload.data);

  if (listMatch && typeof listMatch === "object") {
    return {
      found: true,
      query,
      service: listMatch,
    };
  }

  return {
    found: false,
    query,
    suggestions: payload.suggestions || [],
  };
};

export const createServiceAdapter = ({
  lookupUrl,
  apiKey,
  bearerToken,
  timeoutMs,
}) => ({
  isConfigured: Boolean(lookupUrl),
  async lookupService({ query, locale }) {
    if (!lookupUrl) {
      throw new Error(
        "Service lookup integration is not configured. Set SERVICES_LOOKUP_URL in .env.server."
      );
    }

    const payload = await fetchJsonFromIntegration(lookupUrl, {
      method: "GET",
      query: { query, locale },
      apiKey,
      bearerToken,
      timeoutMs,
    });

    return normalizeServiceResponse(payload, query);
  },
});