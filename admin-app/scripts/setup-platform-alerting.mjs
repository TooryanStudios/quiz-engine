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

const listNotificationChannels = async ({ projectId, token }) => {
  const response = await api({
    method: "GET",
    url: `https://monitoring.googleapis.com/v3/projects/${projectId}/notificationChannels?pageSize=200`,
    token,
  });

  return Array.isArray(response?.notificationChannels) ? response.notificationChannels : [];
};

const getActiveGcloudAccount = () => {
  try {
    return run("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "";
  } catch {
    return "";
  }
};

const resolveNotificationChannels = async ({ projectId, token }) => {
  const explicitChannels = String(process.env.PLATFORM_ALERT_NOTIFICATION_CHANNELS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (explicitChannels.length > 0) {
    return {
      channels: explicitChannels,
      source: "explicit",
      created: false,
      createdChannelName: "",
    };
  }

  const existingChannels = await listNotificationChannels({ projectId, token });
  const enabledChannels = existingChannels
    .filter((channel) => channel?.enabled !== false)
    .map((channel) => String(channel?.name || "").trim())
    .filter(Boolean);

  if (enabledChannels.length > 0) {
    return {
      channels: enabledChannels,
      source: "existing",
      created: false,
      createdChannelName: "",
    };
  }

  const autoCreateEnabled = String(process.env.PLATFORM_ALERT_AUTO_CREATE_EMAIL_CHANNEL || "true")
    .trim()
    .toLowerCase() !== "false";

  if (!autoCreateEnabled) {
    return {
      channels: [],
      source: "none",
      created: false,
      createdChannelName: "",
    };
  }

  const emailAddress = String(process.env.PLATFORM_ALERT_EMAIL || "").trim() || getActiveGcloudAccount();
  if (!emailAddress) {
    return {
      channels: [],
      source: "none",
      created: false,
      createdChannelName: "",
    };
  }

  const created = await api({
    method: "POST",
    url: `https://monitoring.googleapis.com/v3/projects/${projectId}/notificationChannels`,
    token,
    body: {
      type: "email",
      displayName: `Platform Ops Alerts (${emailAddress})`,
      description: "Auto-created by setup-platform-alerting.mjs",
      labels: {
        email_address: emailAddress,
      },
      enabled: true,
    },
  });

  const createdChannelName = String(created?.name || "").trim();
  const channels = createdChannelName ? [createdChannelName] : [];

  return {
    channels,
    source: "auto-created",
    created: channels.length > 0,
    createdChannelName,
  };
};

const ensureLogMetric = async ({ projectId, token, metric }) => {
  const encodedName = encodeURIComponent(metric.name);
  const metricUrl = `https://logging.googleapis.com/v2/projects/${projectId}/metrics/${encodedName}`;

  let exists = false;
  try {
    await api({
      method: "GET",
      url: metricUrl,
      token,
    });
    exists = true;
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }

  if (!exists) {
    await api({
      method: "POST",
      url: `https://logging.googleapis.com/v2/projects/${projectId}/metrics`,
      token,
      body: metric,
    });
    return "created";
  }

  await api({
    method: "PUT",
    url: metricUrl,
    token,
    body: metric,
  });
  return "updated";
};

const buildLogMatchPolicy = ({ displayName, logFilter, notificationChannels, documentation }) => ({
  displayName,
  documentation: {
    content: documentation,
    mimeType: "text/markdown",
  },
  combiner: "OR",
  enabled: true,
  conditions: [
    {
      displayName: `${displayName} log match`,
      conditionMatchedLog: {
        filter: logFilter,
      },
    },
  ],
  notificationChannels,
  alertStrategy: {
    autoClose: "1800s",
    notificationRateLimit: {
      period: "300s",
    },
  },
});

const ensureAlertPolicy = async ({ projectId, token, policy }) => {
  const list = await api({
    method: "GET",
    url: `https://monitoring.googleapis.com/v3/projects/${projectId}/alertPolicies?pageSize=200`,
    token,
  });

  const existing = (list?.alertPolicies || []).find((entry) => entry.displayName === policy.displayName);

  if (!existing) {
    await api({
      method: "POST",
      url: `https://monitoring.googleapis.com/v3/projects/${projectId}/alertPolicies`,
      token,
      body: policy,
    });
    return "created";
  }

  await api({
    method: "PATCH",
    url: `https://monitoring.googleapis.com/v3/${existing.name}?updateMask=display_name,documentation,combiner,enabled,conditions,notification_channels,alert_strategy`,
    token,
    body: {
      ...policy,
      name: existing.name,
    },
  });
  return "updated";
};

const main = async () => {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "qyan-om";

  const token = getAccessToken();
  const resolvedNotificationChannels = await resolveNotificationChannels({
    projectId,
    token,
  });
  const notificationChannels = resolvedNotificationChannels.channels;

  const webhookMetric = {
    name: "platform_validation_webhook_error_count",
    description: "Count of 4xx/5xx responses from /api/platform/uploads/validation-webhook",
    filter: [
      'resource.type="cloud_run_revision"',
      'resource.labels.service_name="chatbot"',
      'httpRequest.requestUrl=~"/api/platform/uploads/validation-webhook"',
      "httpRequest.status>=400",
    ].join(" AND "),
  };

  const retentionMetric = {
    name: "platform_retention_cleanup_error_count",
    description: "Count of error logs emitted by platformRetentionCleanup scheduler",
    filter: [
      "severity>=ERROR",
      '(textPayload:"platformRetentionCleanup" OR jsonPayload.message:"platformRetentionCleanup")',
    ].join(" AND "),
  };

  const workflowSubmittedMetric = {
    name: "platform_workflow_jobs_created_count",
    description: "Count of submitted workflow jobs grouped by tenant",
    filter: [
      'resource.type="cloud_run_revision"',
      'resource.labels.service_name="chatbot"',
      'jsonPayload.platform.event="workflow.job_submitted"',
    ].join(" AND "),
    metricDescriptor: {
      metricKind: "DELTA",
      valueType: "INT64",
      unit: "1",
      labels: [
        {
          key: "tenant_id",
          valueType: "STRING",
          description: "Tenant identifier",
        },
      ],
    },
    labelExtractors: {
      tenant_id: "EXTRACT(jsonPayload.platform.tenantId)",
    },
  };

  const workflowQueueLatencyMetric = {
    name: "platform_workflow_queue_latency_ms",
    description: "Queue latency in milliseconds for workflow job start events",
    filter: [
      'resource.type="cloud_run_revision"',
      'resource.labels.service_name="chatbot"',
      'jsonPayload.platform.event="workflow.job_started"',
    ].join(" AND "),
    metricDescriptor: {
      metricKind: "DELTA",
      valueType: "DISTRIBUTION",
      unit: "ms",
      labels: [
        {
          key: "tenant_id",
          valueType: "STRING",
          description: "Tenant identifier",
        },
      ],
    },
    bucketOptions: {
      exponentialBuckets: {
        numFiniteBuckets: 20,
        growthFactor: 2,
        scale: 1,
      },
    },
    valueExtractor: "EXTRACT(jsonPayload.platform.workflowQueueLatencyMs)",
    labelExtractors: {
      tenant_id: "EXTRACT(jsonPayload.platform.tenantId)",
    },
  };

  const validationLatencyMetric = {
    name: "platform_validation_latency_ms",
    description: "Validation latency in milliseconds for upload validation results",
    filter: [
      'resource.type="cloud_run_revision"',
      'resource.labels.service_name="chatbot"',
      'jsonPayload.platform.event="upload.validation_result"',
      'jsonPayload.platform.validationStatus="safe"',
    ].join(" AND "),
    metricDescriptor: {
      metricKind: "DELTA",
      valueType: "DISTRIBUTION",
      unit: "ms",
      labels: [
        {
          key: "tenant_id",
          valueType: "STRING",
          description: "Tenant identifier",
        },
      ],
    },
    bucketOptions: {
      exponentialBuckets: {
        numFiniteBuckets: 20,
        growthFactor: 2,
        scale: 1,
      },
    },
    valueExtractor: "EXTRACT(jsonPayload.platform.validationLatencyMs)",
    labelExtractors: {
      tenant_id: "EXTRACT(jsonPayload.platform.tenantId)",
    },
  };

  const retentionArchivedMetric = {
    name: "platform_retention_archived_count",
    description: "Archived record volume reported by retention cleanup runs",
    filter: [
      'resource.type="cloud_run_revision"',
      'resource.labels.service_name="platformretentioncleanup"',
      'jsonPayload.platform.event="retention.cleanup_completed"',
    ].join(" AND "),
    metricDescriptor: {
      metricKind: "DELTA",
      valueType: "DISTRIBUTION",
      unit: "1",
    },
    bucketOptions: {
      exponentialBuckets: {
        numFiniteBuckets: 20,
        growthFactor: 2,
        scale: 1,
      },
    },
    valueExtractor: "EXTRACT(jsonPayload.platform.totalArchived)",
  };

  const webhookMetricResult = await ensureLogMetric({
    projectId,
    token,
    metric: webhookMetric,
  });

  const retentionMetricResult = await ensureLogMetric({
    projectId,
    token,
    metric: retentionMetric,
  });

  const workflowSubmittedMetricResult = await ensureLogMetric({
    projectId,
    token,
    metric: workflowSubmittedMetric,
  });

  const workflowQueueLatencyMetricResult = await ensureLogMetric({
    projectId,
    token,
    metric: workflowQueueLatencyMetric,
  });

  const validationLatencyMetricResult = await ensureLogMetric({
    projectId,
    token,
    metric: validationLatencyMetric,
  });

  const retentionArchivedMetricResult = await ensureLogMetric({
    projectId,
    token,
    metric: retentionArchivedMetric,
  });

  const webhookPolicy = buildLogMatchPolicy({
    displayName: "Platform Validation Webhook Error Spike",
    logFilter: webhookMetric.filter,
    notificationChannels,
    documentation:
      "Triggers on webhook 4xx/5xx logs with a 5-minute notification rate limit.\n\nCheck /api/platform/uploads/validation-webhook auth, worker payloads, and secret rotation drift.",
  });

  const retentionPolicy = buildLogMatchPolicy({
    displayName: "Platform Retention Cleanup Errors",
    logFilter: retentionMetric.filter,
    notificationChannels,
    documentation:
      "Triggers when retention cleanup emits any error logs.\n\nCheck scheduler execution logs, Firestore permissions, and archival collection write failures.",
  });

  const webhookPolicyResult = await ensureAlertPolicy({
    projectId,
    token,
    policy: webhookPolicy,
  });

  const retentionPolicyResult = await ensureAlertPolicy({
    projectId,
    token,
    policy: retentionPolicy,
  });

  console.log(JSON.stringify({
    ok: true,
    projectId,
    metrics: {
      [webhookMetric.name]: webhookMetricResult,
      [retentionMetric.name]: retentionMetricResult,
      [workflowSubmittedMetric.name]: workflowSubmittedMetricResult,
      [workflowQueueLatencyMetric.name]: workflowQueueLatencyMetricResult,
      [validationLatencyMetric.name]: validationLatencyMetricResult,
      [retentionArchivedMetric.name]: retentionArchivedMetricResult,
    },
    alertPolicies: {
      [webhookPolicy.displayName]: webhookPolicyResult,
      [retentionPolicy.displayName]: retentionPolicyResult,
    },
    notificationChannelsConfigured: notificationChannels.length,
    notificationChannelsSource: resolvedNotificationChannels.source,
    notificationChannelAutoCreated: resolvedNotificationChannels.created,
    notificationChannelCreatedName: resolvedNotificationChannels.createdChannelName,
  }));
};

main().catch((error) => {
  const status = error?.status ? ` (HTTP ${error.status})` : "";
  const body = error?.body ? `\nResponse body: ${error.body}` : "";
  console.error(`Platform alerting setup failed${status}: ${error?.message || "Unknown error"}${body}`);
  process.exit(1);
});


