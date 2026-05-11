/** Severity levels for log entries. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Indicates whether the log entry originated on the server or client.
 * Enables filtering and source-specific display in the debug console.
 */
export type LogSource = 'server' | 'client';

/**
 * Classifies the purpose of a log entry.
 * Enables category-based filtering and UI colour coding.
 *
 * - general   : Miscellaneous application events.
 * - request   : Outgoing or incoming HTTP request start events.
 * - response  : HTTP response / completion events.
 * - exception : Caught errors and unhandled exceptions.
 */
export type LogCategory = 'general' | 'request' | 'response' | 'exception';

/** Details captured for an outgoing HTTP/API call. */
export interface ApiCallLog {
  /** HTTP method (GET, POST, …). */
  method: string;
  /** Full URL of the request. */
  url: string;
  /** Request headers with sensitive values masked to [REDACTED]. */
  requestHeaders: Record<string, string>;
  /** HTTP response status code. Absent if the request threw before receiving a response. */
  statusCode?: number;
  /** Round-trip duration in milliseconds. */
  durationMs?: number;
  /**
   * cURL equivalent of the request for copy-paste debugging.
   * Sensitive header values are redacted. Optional — omitted when curl generation is disabled.
   */
  curl?: string;
  /**
   * Truncated request body text for display in the debug console.
   * Length is bounded by the `bodyPreviewLimit` option passed to `apiFetch`.
   * Absent when no body was sent or no limit was configured.
   */
  bodyPreview?: string;
  /**
   * Truncated response body text for display in the debug console.
   * Length is bounded by the `responsePreviewLimit` option passed to `apiFetch`.
   * Absent when the response could not be read or no limit was configured.
   */
  responsePreview?: string;
  /** Error message if the request threw or received a non-ok response. */
  error?: string;
}

/** A single entry in the debug console log. */
export interface LogEntry {
  /** Unique identifier for this entry (UUID v4). */
  id: string;
  /** ISO 8601 timestamp when the entry was created. */
  timestamp: string;
  /** Severity of the event. */
  level: LogLevel;
  /**
   * Whether the entry was emitted on the server or client.
   * Useful for filtering and for understanding the execution context.
   */
  source: LogSource;
  /** High-level grouping for filtering and display. */
  category: LogCategory;
  /** Human-readable summary of the event. */
  message: string;
  /**
   * Optional structured key/value metadata attached to the entry.
   * Use this for request payloads, error details, or any diagnostic data.
   */
  metadata?: Record<string, unknown>;
  /** Populated for entries that describe an outgoing HTTP/API call. */
  apiCall?: ApiCallLog;
  /**
   * Optional identifier that links related request / response / error
   * entries together so they can be grouped in the UI.
   */
  requestId?: string;
}
