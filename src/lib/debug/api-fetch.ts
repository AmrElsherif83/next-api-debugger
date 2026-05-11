import { isDebugEnabled } from './env';
import { addEntry } from './log-store';
import { toCurl, maskHeaders } from './curl-generator';
import type { ApiCallLog, LogCategory, LogEntry } from '@/types/debug';

export type ApiFetchInit = RequestInit & {
  /**
   * Override the log category.
   * @deprecated Prefer the `category` field in the `ApiFetchOptions` third argument.
   * When both are set, `ApiFetchOptions.category` takes precedence.
   * Defaults to 'request'.
   */
  logCategory?: LogCategory;
};

/**
 * Additional debug-console options for `apiFetch`.
 * These are separated from the standard `RequestInit` so that debug concerns
 * never bleed into the underlying `fetch` call.
 */
export interface ApiFetchOptions {
  /**
   * Human-readable label prepended to the log message.
   * Useful for identifying a request in the debug console without inspecting the URL.
   * Example: 'fetchUser', 'loadDashboard'
   */
  label?: string;
  /**
   * Override the log category for this request.
   * Takes precedence over `ApiFetchInit.logCategory`.
   * Defaults to 'request'.
   */
  category?: LogCategory;
  /**
   * Maximum number of characters of the request body to store in
   * `apiCall.bodyPreview`. When omitted the field is not populated.
   * The full body is still included in the generated cURL command.
   */
  bodyPreviewLimit?: number;
  /**
   * Maximum number of characters of the response body to store in
   * `apiCall.responsePreview`. When omitted the field is not populated.
   * The response is cloned before reading so the caller can still
   * consume the returned `Response` normally.
   */
  responsePreviewLimit?: number;
}

/**
 * A drop-in replacement for `fetch` that:
 * - Records the request URL, method, masked headers, duration and status code.
 * - Generates a masked cURL representation of every request.
 * - Optionally captures a truncated preview of the request and response bodies.
 * - Logs errors when the request throws or returns a non-ok status.
 * - Is completely inert in production (isDebugEnabled() guard).
 *
 * Usage:
 *   const res = await apiFetch('https://api.example.com/data');
 *   const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(payload) }, {
 *     label: 'createOrder',
 *     responsePreviewLimit: 500,
 *   });
 */
export async function apiFetch(
  url: string,
  init: ApiFetchInit = {},
  options: ApiFetchOptions = {},
): Promise<Response> {
  if (!isDebugEnabled()) {
    return fetch(url, init);
  }

  const { logCategory = 'request', ...fetchInit } = init;
  const { label, category, bodyPreviewLimit, responsePreviewLimit } = options;
  const resolvedCategory = category ?? logCategory;
  const method = (fetchInit.method ?? 'GET').toUpperCase();

  // Normalise headers to a plain Record for logging.
  const rawHeaders = normaliseHeaders(fetchInit.headers);
  const maskedHeaders = maskHeaders(rawHeaders);
  const bodyText = typeof fetchInit.body === 'string' ? fetchInit.body : undefined;
  const curl = toCurl(url, method, rawHeaders, bodyText);
  const bodyPreview =
    bodyText && bodyPreviewLimit && bodyPreviewLimit > 0
      ? truncate(bodyText, bodyPreviewLimit)
      : undefined;

  const requestId = crypto.randomUUID();
  const startMs = Date.now();
  let response: Response | undefined;
  let errorMessage: string | undefined;

  try {
    response = await fetch(url, fetchInit);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startMs;

  // Read a preview of the response body without consuming the original Response.
  let responsePreview: string | undefined;
  if (response && responsePreviewLimit && responsePreviewLimit > 0) {
    try {
      const text = await response.clone().text();
      responsePreview = truncate(text, responsePreviewLimit);
    } catch {
      // Preview read failed — not fatal, proceed without it.
    }
  }

  const apiCall: ApiCallLog = {
    method,
    url,
    requestHeaders: maskedHeaders,
    statusCode: response?.status,
    durationMs,
    curl,
    ...(bodyPreview !== undefined ? { bodyPreview } : {}),
    ...(responsePreview !== undefined ? { responsePreview } : {}),
    ...(errorMessage ? { error: errorMessage } : {}),
  };

  const level = errorMessage || (response && !response.ok) ? 'error' : 'info';
  const prefix = label ? `[${label}] ` : '';
  const message = errorMessage
    ? `${prefix}${method} ${url} — FAILED: ${errorMessage}`
    : `${prefix}${method} ${url} — ${response!.status}`;

  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    source: 'server',
    category: resolvedCategory,
    message,
    apiCall,
    requestId,
  };

  addEntry(entry);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  // `errorMessage` is set only when `response` is undefined (fetch threw), so
  // here response is guaranteed to be defined when errorMessage is absent.
  return response!;
}

function normaliseHeaders(headers: RequestInit['headers'] | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  // `Headers` and `Array` cases are handled above; the only remaining type in
  // `HeadersInit` is `Record<string, string>`, so the cast is exhaustive.
  return headers as Record<string, string>;
}

/** Truncates a string to at most `limit` characters, appending an ellipsis if cut. */
function truncate(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}
