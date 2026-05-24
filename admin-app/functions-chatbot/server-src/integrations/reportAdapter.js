import { fetchJsonFromIntegration } from "./httpJsonClient.js";

const firstArrayItem = (value) => (Array.isArray(value) ? value[0] || null : null);

const normalizeReportResponse = (payload, reportName) => {
  if (!payload) {
    return {
      found: false,
      reportName,
      availableReports: [],
    };
  }

  if (typeof payload.found === "boolean") {
    return payload;
  }

  const directReport = payload.report || payload.result || payload.item;
  if (directReport && typeof directReport === "object") {
    return {
      found: true,
      report: directReport,
    };
  }

  const listMatch =
    firstArrayItem(payload.reports) ||
    firstArrayItem(payload.results) ||
    firstArrayItem(payload.items) ||
    firstArrayItem(payload.data);

  if (listMatch && typeof listMatch === "object") {
    return {
      found: true,
      report: listMatch,
    };
  }

  return {
    found: false,
    reportName,
    availableReports: payload.availableReports || [],
  };
};

export const createReportAdapter = ({
  lookupUrl,
  apiKey,
  bearerToken,
  timeoutMs,
}) => ({
  isConfigured: Boolean(lookupUrl),
  async getReport({ reportName, locale }) {
    if (!lookupUrl) {
      throw new Error(
        "Report integration is not configured. Set REPORTS_LOOKUP_URL in .env.server."
      );
    }

    const payload = await fetchJsonFromIntegration(lookupUrl, {
      method: "GET",
      query: { reportName, locale },
      apiKey,
      bearerToken,
      timeoutMs,
    });

    return normalizeReportResponse(payload, reportName);
  },
});