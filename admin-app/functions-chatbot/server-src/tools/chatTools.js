const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const buildIntegrationStatus = (adapter) => {
  const configured = Boolean(adapter?.isConfigured);

  return {
    available: configured,
    configured,
    provider: "configured-api",
    state: configured ? "ready" : "not_configured",
    note: configured
      ? "Integration endpoint is configured on the backend."
      : "Integration endpoint is not configured on the backend.",
  };
};

const withGracefulToolFailure = async (execute, buildFailureOutput) => {
  try {
    return await execute();
  } catch (error) {
    return buildFailureOutput(error);
  }
};

export const createChatToolRuntime = ({
  openAIConfigured,
  openAIChatModel,
  openAITtsModel,
  openAITtsVoice,
  openAIRealtimeModel,
  frontendOrigin,
  fallbackConfigured,
  serviceAdapter,
  reportAdapter,
  supportAdapter,
  insightAdapter,
  imageLibraryAdapter,
}) => {
  const buildServiceStatusPayload = (service = "all") => {
    const requestedService =
      typeof service === "string" && service.trim() ? service.trim() : "all";

    const serviceStatus = {
      chat: {
        available: Boolean(openAIConfigured),
        provider: "openai",
        model: openAIChatModel,
        toolCalling: true,
      },
      tts: {
        available: Boolean(openAIConfigured),
        provider: "openai",
        model: openAITtsModel,
        voice: openAITtsVoice,
      },
      realtime: {
        available: Boolean(openAIConfigured),
        provider: "openai",
        model: openAIRealtimeModel,
        modalities: ["audio", "text"],
      },
      fallback: {
        available: Boolean(fallbackConfigured),
        configured: Boolean(fallbackConfigured),
        provider: "n8n",
        state: fallbackConfigured ? "ready" : "not_configured",
        note: fallbackConfigured
          ? "Fallback integration is configured on the backend."
          : "Fallback integration is not configured on the backend.",
      },
      serviceLookup: buildIntegrationStatus(serviceAdapter),
      reports: buildIntegrationStatus(reportAdapter),
      support: buildIntegrationStatus(supportAdapter),
      insights: buildIntegrationStatus(insightAdapter),
      imageLibrary: buildIntegrationStatus(imageLibraryAdapter),
    };

    if (requestedService !== "all") {
      if (!serviceStatus[requestedService]) {
        throw new Error(
          'Unsupported service. Choose one of: "all", "chat", "tts", "realtime", "fallback", "serviceLookup", "reports", "support", "insights", or "imageLibrary".'
        );
      }

      return {
        service: requestedService,
        checkedAt: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        status: serviceStatus[requestedService],
      };
    }

    return {
      service: "all",
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      frontendOrigin,
      services: serviceStatus,
    };
  };

  const chatTools = [
    {
      type: "function",
      name: "get_service_status",
      description:
        "Get the live status of chatbot services such as chat, text-to-speech, realtime voice, fallback integration, service lookup, reports, or support flows. استخدمها عند السؤال عن حالة الخدمات الحالية.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "all",
              "chat",
              "tts",
              "realtime",
              "fallback",
              "serviceLookup",
              "reports",
              "support",
              "insights",
              "imageLibrary",
            ],
            description:
              'Which service to inspect. Use "all" for a full status snapshot.',
          },
        },
        required: ["service"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "lookup_service",
      description:
        "Look up a supported service and return its summary, channel, requirements, and availability. استخدمها عند السؤال عن خدمة أو متطلبات خدمة.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The service name, category, or keywords to search for.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "get_report",
      description:
        "Fetch an operational report by report name and return its summary, metrics, and highlights. استخدمها عند السؤال عن تقرير أو مؤشرات تشغيلية.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          reportName: {
            type: "string",
            description: "The report name or report identifier to retrieve.",
          },
        },
        required: ["reportName"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "create_support_ticket",
      description:
        "Create a support ticket for a user request and return the generated ticket number. استخدمها عندما يطلب المستخدم إنشاء تذكرة دعم.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "A short title describing the request or issue.",
          },
          requesterContact: {
            type: "string",
            description:
              "The user's contact detail, such as email or phone number.",
          },
          details: {
            type: "string",
            description: "A detailed description of the support request.",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "The urgency level of the support ticket.",
          },
        },
        required: ["subject", "requesterContact", "details", "priority"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "get_live_insight",
      description:
        "Retrieve a live statistic, KPI, demographic figure, or endpoint-backed fact such as the population of Oman. Use it when the user asks for a number, figure, trend, or dashboard-ready summary. استخدمها عند السؤال عن رقم مباشر أو مؤشر أو إحصائية أو معلومة من نقطة نهاية.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The fact, KPI, or statistic to look up from the configured endpoint.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "search_image_library",
      description:
        "Search a configured image library and return images that can be displayed beside the avatar. Use it when the user asks to show relevant images, photos, or visual references. استخدمها عند طلب صور أو مكتبة صور أو مرجع بصري مرتبط بالموضوع.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The subject, place, or theme to search for in the image library.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "dismiss_results",
      description:
        "Close or dismiss the live results panel that is currently showing images, reports, statistics, or service data. Use it when the user asks to close, hide, dismiss, or clear the results panel or image gallery. استخدمها عندما يطلب المستخدم إغلاق أو إخفاء لوحة النتائج أو معرض الصور.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  ];

  const toolHandlers = {
    get_service_status: async (args = {}) =>
      buildServiceStatusPayload(args.service || "all"),
    lookup_service: async (args = {}) => {
      return withGracefulToolFailure(
        async () => {
          if (!serviceAdapter) {
            throw new Error("Service adapter is not available.");
          }

          return serviceAdapter.lookupService({
            query: args.query || "",
            locale: args.locale || "en",
          });
        },
        (error) => ({
          found: false,
          query: args.query || "",
          configured: Boolean(serviceAdapter?.isConfigured),
          error:
            error?.message ||
            "Service lookup integration is currently unavailable.",
        })
      );
    },
    get_report: async (args = {}) => {
      return withGracefulToolFailure(
        async () => {
          if (!reportAdapter) {
            throw new Error("Report adapter is not available.");
          }

          return reportAdapter.getReport({
            reportName: args.reportName || "",
            locale: args.locale || "en",
          });
        },
        (error) => ({
          found: false,
          reportName: args.reportName || "",
          configured: Boolean(reportAdapter?.isConfigured),
          error:
            error?.message || "Report integration is currently unavailable.",
        })
      );
    },
    create_support_ticket: async (args = {}) => {
      return withGracefulToolFailure(
        async () => {
          if (!supportAdapter) {
            throw new Error("Support adapter is not available.");
          }

          return supportAdapter.createTicket({
            subject: args.subject,
            requesterContact: args.requesterContact,
            details: args.details,
            priority: args.priority,
            locale: args.locale || "en",
          });
        },
        (error) => ({
          created: false,
          configured: Boolean(supportAdapter?.isConfigured),
          error:
            error?.message ||
            "Support integration is currently unavailable.",
        })
      );
    },
    get_live_insight: async (args = {}) => {
      return withGracefulToolFailure(
        async () => {
          if (!insightAdapter) {
            throw new Error("Insight adapter is not available.");
          }

          return insightAdapter.lookupInsight({
            query: args.query || "",
            locale: args.locale || "en",
          });
        },
        (error) => ({
          found: false,
          query: args.query || "",
          configured: Boolean(insightAdapter?.isConfigured),
          error:
            error?.message ||
            "Insight integration is currently unavailable.",
        })
      );
    },
    search_image_library: async (args = {}) => {
      return withGracefulToolFailure(
        async () => {
          if (!imageLibraryAdapter) {
            throw new Error("Image library adapter is not available.");
          }

          return imageLibraryAdapter.searchImages({
            query: args.query || "",
            locale: args.locale || "en",
          });
        },
        (error) => ({
          found: false,
          query: args.query || "",
          configured: Boolean(imageLibraryAdapter?.isConfigured),
          images: [],
          error:
            error?.message ||
            "Image library integration is currently unavailable.",
        })
      );
    },
    dismiss_results: async () => ({
      dismissed: true,
      message: "The results panel has been dismissed.",
    }),
  };

  return {
    chatTools,
    executeToolCall: async (toolCall) => {
      const handler = toolHandlers[toolCall.name];
      if (!handler) {
        throw new Error(`No handler registered for tool "${toolCall.name}".`);
      }

      const parsedArguments = toolCall.arguments
        ? safeJsonParse(toolCall.arguments)
        : {};

      if (parsedArguments === null || Array.isArray(parsedArguments)) {
        throw new Error(`Tool "${toolCall.name}" received invalid arguments.`);
      }

      if (!parsedArguments.locale) {
        parsedArguments.locale = "en";
      }

      const output = await handler(parsedArguments);
      return {
        name: toolCall.name,
        arguments: parsedArguments,
        output,
      };
    },
    getRuntimeStats: () => ({
      availableTools: chatTools.map((tool) => tool.name),
      integrations: {
        serviceLookupConfigured: Boolean(serviceAdapter?.isConfigured),
        reportsConfigured: Boolean(reportAdapter?.isConfigured),
        supportConfigured: Boolean(supportAdapter?.isConfigured),
        insightsConfigured: Boolean(insightAdapter?.isConfigured),
        imageLibraryConfigured: Boolean(imageLibraryAdapter?.isConfigured),
      },
    }),
  };
};