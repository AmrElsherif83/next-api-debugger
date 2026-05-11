import { randomUUID } from 'crypto';
import { isDebugEnabled } from './env';
import { addEntry } from './log-store';
import { toCurl, maskHeaders } from './curl-generator';
import type { ApiCallLog, LogCategory, LogEntry } from '@/types/debug';

export type ApiFetchInit = RequestInit & {
  /** Override the log category. Defaults to 'request'. */
  logCategory?: LogCategory;
};

/**
 * A drop-in replacement for `fetch` that:
 * - Records the request URL, method, masked headers, duration and status code.
 * - Generates a masked cURL representation of every request.
 * - Logs errors when the request throws or returns a non-ok status.
 * - Is completely inert in production (isDebugEnabled() guard).
 *
 * Usage:
 *   const res = await apiFetch('https://api.example.com/data');
 */
export async function apiFetch(url: string, init: ApiFetchInit = {}): Promise<Response> {
  if (!isDebugEnabled()) {
    return fetch(url, init);
  }

  const { logCategory = 'request', ...fetchInit } = init;
  const method = (fetchInit.method ?? 'GET').toUpperCase();

  // Normalise headers to a plain Record for logging.
  const rawHeaders = normaliseHeaders(fetchInit.headers);
  const maskedHeaders = maskHeaders(rawHeaders);
  const bodyText = typeof fetchInit.body === 'string' ? fetchInit.body : undefined;
  const curl = toCurl(url, method, rawHeaders, bodyText);

  const requestId = randomUUID();
  const startMs = Date.now();
  let response: Response | undefined;
  let errorMessage: string | undefined;

  try {
    response = await fetch(url, fetchInit);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startMs;

  const apiCall: ApiCallLog = {
    method,
    url,
    requestHeaders: maskedHeaders,
    statusCode: response?.status,
    durationMs,
    curl,
    ...(errorMessage ? { error: errorMessage } : {}),
  };

  const level = errorMessage || (response && !response.ok) ? 'error' : 'info';
  const message = errorMessage
    ? `${method} ${url} — FAILED: ${errorMessage}`
    : `${method} ${url} — ${response!.status}`;

  const entry: LogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    source: 'server',
    category: logCategory,
    message,
    apiCall,
    requestId,
  };

  addEntry(entry);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

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
  return headers as Record<string, string>;
}
