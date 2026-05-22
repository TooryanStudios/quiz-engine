import {
  analyzePlatformRequestContext,
  buildCategorySpecificPromptPlan,
  buildCategorySpecificRagPlan,
} from "./contextAnalysis.js";
import { classifyPlatformRequest } from "./classifier.js";

const normalizeRequestPayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};

  return {
    projectId: String(body.projectId || "").trim(),
    workspaceId: String(body.workspaceId || "").trim(),
    tenantId: String(body.tenantId || "").trim(),
    goal: String(body.goal || "").trim(),
    prompt: String(body.prompt || "").trim(),
    requestedOutputType: String(body.requestedOutputType || body.outputType || "").trim(),
    inputs: Array.isArray(body.inputs) ? body.inputs : [],
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  };
};

const validatePayload = (payload) => {
  const errors = [];
  if (!payload.goal && !payload.prompt) {
    errors.push("goal or prompt is required.");
  }

  if (!payload.projectId) {
    errors.push("projectId is required.");
  }

  if (!payload.workspaceId) {
    errors.push("workspaceId is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseIsoToEpochMs = (value) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const logPlatformEvent = (event, payload = {}) => {
  console.log(JSON.stringify({
    event: "platform.telemetry",
    platform: {
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    },
  }));
};

export const createPlatformWorkflowEngine = ({ jobStore }) => {
  if (!jobStore) {
    throw new Error("jobStore is required.");
  }

  const queue = [];
  let isDraining = false;

  const enqueue = (jobId) => {
    queue.push(jobId);
    void drainQueue();
  };

  const drainQueue = async () => {
    if (isDraining) {
      return;
    }

    isDraining = true;
    while (queue.length) {
      const nextJobId = queue.shift();
      if (nextJobId) {
        await runJob(nextJobId);
      }
    }
    isDraining = false;
  };

  const stage = async (jobId, name, action) => {
    const startedAt = new Date().toISOString();
    const details = await action();
    const finishedAt = new Date().toISOString();
    await jobStore.appendStage(jobId, {
      name,
      status: "completed",
      startedAt,
      finishedAt,
      details,
    });
    return details;
  };

  const runJob = async (jobId) => {
    const existing = await jobStore.getJob(jobId);
    if (!existing) {
      return;
    }

    const queueLatencyMs = Math.max(0, Date.now() - parseIsoToEpochMs(existing.createdAt));
    const payloadForTelemetry = normalizeRequestPayload(existing.payload);

    logPlatformEvent("workflow.job_started", {
      increment: 1,
      jobId,
      ownerUid: existing.ownerUid,
      tenantId: payloadForTelemetry.tenantId || "unknown",
      workspaceId: payloadForTelemetry.workspaceId || "",
      projectId: payloadForTelemetry.projectId || "",
      workflowQueueLatencyMs: queueLatencyMs,
    });

    await jobStore.updateJob(jobId, {
      status: "running",
      error: null,
    });

    const payload = payloadForTelemetry;

    try {
      const validation = await stage(jobId, "validation", async () => {
        await sleep(5);
        return validatePayload(payload);
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join(" "));
      }

      const context = await stage(jobId, "context-analysis", async () => {
        return analyzePlatformRequestContext(payload);
      });

      const classification = await stage(jobId, "category-classification", async () => {
        return classifyPlatformRequest({ context });
      });

      const ragPlan = await stage(jobId, "rag-plan", async () => {
        return buildCategorySpecificRagPlan(classification);
      });

      const promptPlan = await stage(jobId, "prompt-plan", async () => {
        return buildCategorySpecificPromptPlan({ context, classification });
      });

      await jobStore.updateJob(jobId, {
        status: "succeeded",
        result: {
          validation,
          context,
          classification,
          ragPlan,
          promptPlan,
          nextActions: [
            "Connect file validation service",
            "Connect vector retrieval service",
            "Connect model router service",
            "Connect generation orchestrator",
          ],
        },
        error: null,
      });

      const totalLatencyMs = Math.max(0, Date.now() - parseIsoToEpochMs(existing.createdAt));
      logPlatformEvent("workflow.job_succeeded", {
        increment: 1,
        jobId,
        ownerUid: existing.ownerUid,
        tenantId: payload.tenantId || "unknown",
        workspaceId: payload.workspaceId || "",
        projectId: payload.projectId || "",
        workflowQueueLatencyMs: queueLatencyMs,
        workflowTotalLatencyMs: totalLatencyMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow job failed.";
      await jobStore.updateJob(jobId, {
        status: "failed",
        error: {
          message,
          occurredAt: new Date().toISOString(),
        },
      });

      await jobStore.appendStage(jobId, {
        name: "failed",
        status: "failed",
        details: { message },
      });

      const totalLatencyMs = Math.max(0, Date.now() - parseIsoToEpochMs(existing.createdAt));
      logPlatformEvent("workflow.job_failed", {
        increment: 1,
        jobId,
        ownerUid: existing.ownerUid,
        tenantId: payload.tenantId || "unknown",
        workspaceId: payload.workspaceId || "",
        projectId: payload.projectId || "",
        workflowQueueLatencyMs: queueLatencyMs,
        workflowTotalLatencyMs: totalLatencyMs,
        errorMessage: message,
      });
    }
  };

  const submitJob = async ({ ownerUid, payload }) => {
    const normalizedPayload = normalizeRequestPayload(payload);
    const created = await jobStore.createJob({
      ownerUid,
      payload: normalizedPayload,
    });

    logPlatformEvent("workflow.job_submitted", {
      increment: 1,
      jobId: created.id,
      ownerUid,
      tenantId: normalizedPayload.tenantId || "unknown",
      workspaceId: normalizedPayload.workspaceId || "",
      projectId: normalizedPayload.projectId || "",
    });

    enqueue(created.id);
    return created;
  };

  return {
    submitJob,
    getJobForOwner: async (params) => jobStore.getJobForOwner(params),
    listJobsForOwner: async (params) => jobStore.listJobsForOwner(params),
    getHealthSnapshot: async () => ({
      queueDepth: queue.length,
      isDraining,
      store: await jobStore.getHealthSnapshot(),
    }),
  };
};
