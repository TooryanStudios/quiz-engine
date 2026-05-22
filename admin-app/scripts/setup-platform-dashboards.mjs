import process from "node:process";
import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed: ${stderr || "unknown error"}`);
  }

  return String(result.stdout || "").trim();
};

const getAccessToken = () => run("gcloud", ["auth", "print-access-token"]);

const api = async ({ method, url, token, body }) => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const error = new Error(`${method} ${url} failed with HTTP ${response.status}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  return json;
};

const buildTimeSeriesUrl = ({ projectId, metricType, startIso, endIso }) => {
  const query = new URLSearchParams();
  query.set("filter", `metric.type=\"${metricType}\"`);
  query.set("interval.startTime", startIso);
  query.set("interval.endTime", endIso);
  query.set("view", "HEADERS");
  query.set("pageSize", "200");
  return `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${query.toString()}`;
};

const discoverTenantIdsFromMetrics = async ({ projectId, token }) => {
  const lookbackHours = Number(process.env.PLATFORM_DASHBOARD_TENANT_LOOKBACK_HOURS) > 0
    ? Number(process.env.PLATFORM_DASHBOARD_TENANT_LOOKBACK_HOURS)
    : 168;

  const endEpochMs = Date.now();
  const startEpochMs = endEpochMs - (lookbackHours * 60 * 60 * 1000);
  const endIso = new Date(endEpochMs).toISOString();
  const startIso = new Date(startEpochMs).toISOString();

  const metricTypes = [
    "logging.googleapis.com/user/platform_workflow_jobs_created_count",
    "logging.googleapis.com/user/platform_validation_latency_ms",
  ];

  const tenants = new Set();

  for (const metricType of metricTypes) {
    try {
      const response = await api({
        method: "GET",
        url: buildTimeSeriesUrl({
          projectId,
          metricType,
          startIso,
          endIso,
        }),
        token,
      });

      const entries = Array.isArray(response?.timeSeries) ? response.timeSeries : [];
      for (const entry of entries) {
        const tenantId = String(entry?.metric?.labels?.tenant_id || "").trim();
        if (tenantId) {
          tenants.add(tenantId);
        }
      }
    } catch {
      // Ignore sparse metric lookup failures and keep best-effort behavior.
    }
  }

  return Array.from(tenants).sort((a, b) => a.localeCompare(b));
};

const buildTenantMetricFilter = ({ metricName, tenantId }) => {
  const base = `metric.type=\"logging.googleapis.com/user/${metricName}\"`;
  if (!tenantId) {
    return base;
  }
  return `${base} AND metric.labels.tenant_id=\"${tenantId}\"`;
};

const buildDashboard = ({ projectId, tenantId }) => {
  const tenantLabel = tenantId || "all-tenants";
  const titleSuffix = tenantId ? `Tenant ${tenantId}` : "All Tenants";

  const workflowCountFilter = buildTenantMetricFilter({
    metricName: "platform_workflow_jobs_created_count",
    tenantId,
  });

  const workflowQueueLatencyFilter = buildTenantMetricFilter({
    metricName: "platform_workflow_queue_latency_ms",
    tenantId,
  });

  const validationLatencyFilter = buildTenantMetricFilter({
    metricName: "platform_validation_latency_ms",
    tenantId,
  });

  const archiveVolumeFilter = "metric.type=\"logging.googleapis.com/user/platform_retention_archived_count\"";

  return {
    displayName: `Platform Operations Dashboard - ${titleSuffix}`,
    mosaicLayout: {
      columns: 12,
      tiles: [
        {
          xPos: 0,
          yPos: 0,
          width: 6,
          height: 4,
          widget: {
            title: `Workflow Jobs Submitted (${titleSuffix})`,
            xyChart: {
              dataSets: [
                {
                  plotType: "LINE",
                  timeSeriesQuery: {
                    timeSeriesFilter: {
                      filter: workflowCountFilter,
                      aggregation: {
                        alignmentPeriod: "300s",
                        perSeriesAligner: "ALIGN_DELTA",
                        crossSeriesReducer: "REDUCE_SUM",
                        groupByFields: [],
                      },
                    },
                  },
                },
              ],
              timeshiftDuration: "0s",
              yAxis: {
                label: "Jobs / 5m",
                scale: "LINEAR",
              },
            },
          },
        },
        {
          xPos: 6,
          yPos: 0,
          width: 6,
          height: 4,
          widget: {
            title: `Workflow Queue Latency P95 (${titleSuffix})`,
            xyChart: {
              dataSets: [
                {
                  plotType: "LINE",
                  timeSeriesQuery: {
                    timeSeriesFilter: {
                      filter: workflowQueueLatencyFilter,
                      aggregation: {
                        alignmentPeriod: "300s",
                        perSeriesAligner: "ALIGN_PERCENTILE_95",
                      },
                    },
                  },
                },
              ],
              timeshiftDuration: "0s",
              yAxis: {
                label: "ms",
                scale: "LINEAR",
              },
            },
          },
        },
        {
          xPos: 0,
          yPos: 4,
          width: 6,
          height: 4,
          widget: {
            title: `Validation Latency P95 (${titleSuffix})`,
            xyChart: {
              dataSets: [
                {
                  plotType: "LINE",
                  timeSeriesQuery: {
                    timeSeriesFilter: {
                      filter: validationLatencyFilter,
                      aggregation: {
                        alignmentPeriod: "300s",
                        perSeriesAligner: "ALIGN_PERCENTILE_95",
                      },
                    },
                  },
                },
              ],
              timeshiftDuration: "0s",
              yAxis: {
                label: "ms",
                scale: "LINEAR",
              },
            },
          },
        },
        {
          xPos: 6,
          yPos: 4,
          width: 6,
          height: 4,
          widget: {
            title: "Retention Archived Records P50 (Global)",
            xyChart: {
              dataSets: [
                {
                  plotType: "STACKED_BAR",
                  timeSeriesQuery: {
                    timeSeriesFilter: {
                      filter: archiveVolumeFilter,
                      aggregation: {
                        alignmentPeriod: "3600s",
                        perSeriesAligner: "ALIGN_PERCENTILE_50",
                        crossSeriesReducer: "REDUCE_SUM",
                        groupByFields: [],
                      },
                    },
                  },
                },
              ],
              timeshiftDuration: "0s",
              yAxis: {
                label: "Archived records per run",
                scale: "LINEAR",
              },
            },
          },
        },
        {
          xPos: 0,
          yPos: 8,
          width: 12,
          height: 4,
          widget: {
            title: `Platform Telemetry Logs (${titleSuffix})`,
            logsPanel: {
              filter: [
                'resource.type="cloud_run_revision"',
                'resource.labels.service_name="chatbot"',
                tenantId ? `jsonPayload.platform.tenantId="${tenantId}"` : "",
              ].filter(Boolean).join(" AND "),
              resourceNames: [`projects/${projectId}`],
            },
          },
        },
      ],
    },
    labels: {
      platform: "operations",
      scope: tenantLabel,
    },
  };
};

const ensureDashboard = async ({ projectId, token, dashboard }) => {
  const list = await api({
    method: "GET",
    url: `https://monitoring.googleapis.com/v1/projects/${projectId}/dashboards?pageSize=200`,
    token,
  });

  const existing = (list?.dashboards || []).find((entry) => entry.displayName === dashboard.displayName);

  if (existing?.name) {
    await api({
      method: "DELETE",
      url: `https://monitoring.googleapis.com/v1/${existing.name}`,
      token,
    });
  }

  const created = await api({
    method: "POST",
    url: `https://monitoring.googleapis.com/v1/projects/${projectId}/dashboards`,
    token,
    body: dashboard,
  });

  return {
    displayName: dashboard.displayName,
    action: existing ? "replaced" : "created",
    name: created?.name || "",
  };
};

const main = async () => {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "qyan-om";

  const tenantIds = String(process.env.PLATFORM_DASHBOARD_TENANT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const token = getAccessToken();
  const discoveredTenantIds = tenantIds.length
    ? []
    : await discoverTenantIdsFromMetrics({ projectId, token });
  const requestedTenants = tenantIds.length
    ? tenantIds
    : discoveredTenantIds.length
      ? discoveredTenantIds
      : [""];
  const includeAllTenantsDashboard = String(process.env.PLATFORM_DASHBOARD_INCLUDE_ALL_TENANTS || "true")
    .trim()
    .toLowerCase() !== "false";
  const requestedScopes = includeAllTenantsDashboard
    ? Array.from(new Set(["", ...requestedTenants]))
    : requestedTenants;
  const dashboards = [];

  for (const tenantId of requestedScopes) {
    const dashboard = buildDashboard({
      projectId,
      tenantId,
    });

    const result = await ensureDashboard({
      projectId,
      token,
      dashboard,
    });

    dashboards.push({
      tenantId: tenantId || "all-tenants",
      ...result,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    projectId,
    discoveredTenantIds,
    dashboards,
  }));
};

main().catch((error) => {
  const status = error?.status ? ` (HTTP ${error.status})` : "";
  const body = error?.body ? `\nResponse body: ${error.body}` : "";
  console.error(`Platform dashboard setup failed${status}: ${error?.message || "Unknown error"}${body}`);
  process.exit(1);
});
