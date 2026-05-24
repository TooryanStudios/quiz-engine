const DEFAULT_TIMEOUT_MS = 15000;

const parseResponseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { rawText: text } : null;
  } catch (_error) {
    return null;
  }
};

const buildHeaders = ({ apiKey, bearerToken, headers = {} }) => {
  const resolvedHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (apiKey) {
    resolvedHeaders["x-api-key"] = apiKey;
  }

  if (bearerToken) {
    resolvedHeaders.Authorization = `Bearer ${bearerToken}`;
  }

  return resolvedHeaders;
};

const buildUrl = (url, query) => {
  const targetUrl = new URL(url);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      targetUrl.searchParams.set(key, String(value));
    });
  }

  return targetUrl.toString();
};

export const fetchJsonFromIntegration = async (
  url,
  {
    method = "GET",
    query,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    apiKey,
    bearerToken,
    headers,
  } = {}
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders = buildHeaders({ apiKey, bearerToken, headers });
    const requestOptions = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    };

    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(buildUrl(url, query), requestOptions);
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        payload?.error ||
        payload?.message ||
        payload?.rawText ||
        `Integration request failed with status ${response.status}.`;
      throw new Error(errorMessage);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Integration request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};