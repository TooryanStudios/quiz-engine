import { fetchJsonFromIntegration } from "./httpJsonClient.js";

const firstArrayItem = (value) => (Array.isArray(value) ? value[0] || null : null);

const normalizeImages = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (typeof entry === "string" && entry.trim()) {
        return {
          src: entry.trim(),
          alt: `Insight image ${index + 1}`,
          title: `Insight image ${index + 1}`,
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
        alt: entry.alt || entry.title || `Insight image ${index + 1}`,
        title: entry.title || entry.caption || `Insight image ${index + 1}`,
      };
    })
    .filter(Boolean);
};

const normalizeMetricEntries = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const numericValue =
          typeof entry.value === "number"
            ? entry.value
            : typeof entry.numericValue === "number"
              ? entry.numericValue
              : null;

        return {
          label: entry.label || entry.name || entry.title || "Metric",
          value: numericValue,
          displayValue:
            entry.displayValue ||
            (numericValue !== null ? String(numericValue) : String(entry.value ?? "-")),
        };
      })
      .filter(Boolean);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value)
    .filter(([, entryValue]) =>
      ["string", "number", "boolean"].includes(typeof entryValue)
    )
    .map(([key, entryValue]) => ({
      label: key,
      value: typeof entryValue === "number" ? entryValue : null,
      displayValue: String(entryValue),
    }));
};

const normalizeChart = (value, metricEntries) => {
  const sourceBars = Array.isArray(value)
    ? value
    : Array.isArray(value?.bars)
      ? value.bars
      : metricEntries.filter((entry) => typeof entry.value === "number");

  const bars = sourceBars
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const numericValue =
        typeof entry.value === "number"
          ? entry.value
          : typeof entry.numericValue === "number"
            ? entry.numericValue
            : null;

      if (numericValue === null) {
        return null;
      }

      return {
        label: entry.label || entry.name || entry.title || "Series",
        value: numericValue,
        displayValue:
          entry.displayValue ||
          (typeof entry.value === "string" ? entry.value : String(numericValue)),
      };
    })
    .filter(Boolean);

  if (!bars.length) {
    return null;
  }

  return {
    title: value?.title || "Trend",
    bars,
  };
};

const buildHeadline = (insight, query, metricEntries) => {
  if (insight?.headline && typeof insight.headline === "object") {
    return insight.headline;
  }

  const candidateKeys = ["displayValue", "value", "statistic", "number", "population", "total", "count"];
  for (const key of candidateKeys) {
    if (insight && insight[key] !== undefined && insight[key] !== null) {
      return {
        label: insight.label || insight.title || query,
        value: insight[key],
        unit: insight.unit || "",
        source: insight.source || "",
      };
    }
  }

  const firstNumericMetric = metricEntries.find(
    (entry) => typeof entry.value === "number"
  );
  if (firstNumericMetric) {
    return {
      label: insight?.title || query,
      value: firstNumericMetric.displayValue,
      unit: "",
      source: insight?.source || "",
    };
  }

  return null;
};

const withPresentation = ({ query, insight, payload }) => {
  const metricEntries = normalizeMetricEntries(
    insight?.metrics || payload?.metrics || insight?.values || payload?.values
  );
  const images = normalizeImages(
    insight?.images || payload?.images || insight?.media?.images || payload?.media?.images
  );
  const chart = normalizeChart(insight?.chart || payload?.chart, metricEntries);
  const headline = buildHeadline(insight, query, metricEntries);

  return {
    found: true,
    query,
    insight,
    presentation: {
      title: insight?.title || query,
      summary:
        insight?.summary ||
        insight?.description ||
        payload?.summary ||
        payload?.description ||
        "",
      headline,
      metrics: metricEntries,
      chart,
      images,
      source: insight?.source || payload?.source || "",
      highlights: Array.isArray(insight?.highlights)
        ? insight.highlights
        : Array.isArray(payload?.highlights)
          ? payload.highlights
          : [],
    },
  };
};

const normalizeInsightResponse = (payload, query) => {
  if (!payload) {
    return {
      found: false,
      query,
      suggestions: [],
    };
  }

  if (typeof payload.found === "boolean") {
    if (!payload.found) {
      return payload;
    }

    const insight = payload.insight || payload.result || payload.item || payload;
    return withPresentation({ query, insight, payload });
  }

  const directInsight =
    payload.insight ||
    payload.result ||
    payload.item ||
    firstArrayItem(payload.items) ||
    firstArrayItem(payload.results) ||
    firstArrayItem(payload.data);

  if (directInsight && typeof directInsight === "object") {
    return withPresentation({ query, insight: directInsight, payload });
  }

  if (
    payload.value !== undefined ||
    payload.displayValue !== undefined ||
    payload.population !== undefined
  ) {
    return withPresentation({ query, insight: payload, payload });
  }

  return {
    found: false,
    query,
    suggestions: payload.suggestions || [],
  };
};

export const createInsightAdapter = ({ lookupUrl, apiKey, bearerToken, timeoutMs }) => ({
  isConfigured: Boolean(lookupUrl),
  async lookupInsight({ query, locale }) {
    if (!lookupUrl) {
      throw new Error(
        "Insight integration is not configured. Set INSIGHTS_LOOKUP_URL in .env.server."
      );
    }

    const payload = await fetchJsonFromIntegration(lookupUrl, {
      method: "GET",
      query: { query, locale },
      apiKey,
      bearerToken,
      timeoutMs,
    });

    return normalizeInsightResponse(payload, query);
  },
});