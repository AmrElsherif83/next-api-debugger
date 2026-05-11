import { randomUUID } from 'crypto';
import { isDebugEnabled } from './env';
import { addEntry } from './log-store';
import type { LogLevel, LogEntry } from '@/types/debug';

function createEntry(
  level: LogLevel,
  category: string,
  message: string,
  data?: unknown,
): LogEntry {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data,
  };
}

function write(level: LogLevel, category: string, message: string, data?: unknown): void {
  if (!isDebugEnabled()) return;
  const entry = createEntry(level, category, message, data);
  addEntry(entry);
}

export const logger = {
  info(message: string, data?: unknown, category = 'app'): void {
    write('info', category, message, data);
  },
  warn(message: string, data?: unknown, category = 'app'): void {
    write('warn', category, message, data);
  },
  error(message: string, data?: unknown, category = 'app'): void {
    write('error', category, message, data);
  },
  debug(message: string, data?: unknown, category = 'app'): void {
    write('debug', category, message, data);
  },
  log(message: string, data?: unknown, category = 'app'): void {
    write('log', category, message, data);
  },
};
