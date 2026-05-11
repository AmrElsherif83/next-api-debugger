export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'log';

export interface ApiCallLog {
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  statusCode?: number;
  durationMs?: number;
  curl: string;
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  apiCall?: ApiCallLog;
}
