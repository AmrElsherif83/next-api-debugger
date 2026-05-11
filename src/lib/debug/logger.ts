import { isDebugEnabled } from './env';
import { addEntry } from './log-store';
import type { LogLevel, LogSource, LogCategory, LogEntry } from '@/types/debug';

function createEntry(
  level: LogLevel,
  source: LogSource,
  category: LogCategory,
  message: string,
  metadata?: Record<string, unknown>,
  requestId?: string,
): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    source,
    category,
    message,
    ...(metadata !== undefined ? { metadata } : {}),
    ...(requestId !== undefined ? { requestId } : {}),
  };
}

function write(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, unknown>,
  source: LogSource = 'server',
  requestId?: string,
): void {
  if (!isDebugEnabled()) return;
  const entry = createEntry(level, source, category, message, metadata, requestId);
  addEntry(entry);
}

export const logger = {
  info(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'general',
    source: LogSource = 'server',
    requestId?: string,
  ): void {
    write('info', category, message, metadata, source, requestId);
  },
  warn(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'general',
    source: LogSource = 'server',
    requestId?: string,
  ): void {
    write('warn', category, message, metadata, source, requestId);
  },
  error(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'exception',
    source: LogSource = 'server',
    requestId?: string,
  ): void {
    write('error', category, message, metadata, source, requestId);
  },
  debug(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'general',
    source: LogSource = 'server',
    requestId?: string,
  ): void {
    write('debug', category, message, metadata, source, requestId);
  },
};
