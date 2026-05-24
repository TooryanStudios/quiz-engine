import { fetchJsonFromIntegration } from "./httpJsonClient.js";

const normalizeTicketResponse = (payload, fallbackPayload) => {
  if (!payload) {
    return {
      created: false,
      error: "Support integration returned an empty response.",
    };
  }

  if (typeof payload.created === "boolean") {
    return payload;
  }

  const ticket = payload.ticket || payload.result || payload.item || null;
  if (ticket && typeof ticket === "object") {
    return {
      created: true,
      ticket,
    };
  }

  if (payload.id || payload.ticketId) {
    return {
      created: true,
      ticket: {
        ...fallbackPayload,
        ...payload,
      },
    };
  }

  return {
    created: false,
    error: payload.error || payload.message || "Support integration response was not recognized.",
  };
};

export const createSupportAdapter = ({
  createUrl,
  apiKey,
  bearerToken,
  timeoutMs,
}) => ({
  isConfigured: Boolean(createUrl),
  async createTicket({ subject, requesterContact, details, priority, locale }) {
    if (!createUrl) {
      throw new Error(
        "Support integration is not configured. Set SUPPORT_TICKETS_URL in .env.server."
      );
    }

    const requestPayload = {
      subject,
      requesterContact,
      details,
      priority,
      locale,
    };

    const payload = await fetchJsonFromIntegration(createUrl, {
      method: "POST",
      body: requestPayload,
      apiKey,
      bearerToken,
      timeoutMs,
    });

    return normalizeTicketResponse(payload, requestPayload);
  },
});