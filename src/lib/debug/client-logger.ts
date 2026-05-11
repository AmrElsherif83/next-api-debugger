'use client';

/**
 * Browser-side debug logger.
 *
 * Mirrors the `logger` API but sends entries to `POST /api/debug/logs` instead
 * of writing directly to the in-memory store (which lives in the Node.js
 * process and is not accessible from the browser).
 *
 * Safety guarantees
 * -----------------
 * - isDebugEnabledClient() is checked before every request.  The logger is a
 *   complete no-op in production; nothing is sent over the network.
 * - Network failures are silently swallowed so that a failed debug request
 *   never breaks the application.
 * - Only the fields listed in `ClientLogPayload` are forwarded.  Secrets that
 *   happen to live in other module-level variables are never included.
 * - `source` is always forced to `'client'` by the server-side route handler
 *   so the caller cannot spoof a server origin.
 *
 * Usage (in a Client Component):
 * ```tsx
 * 'use client';
 * import { clientLogger } from '@/lib/debug/client-logger';
 *
 * export function MyComponent() {
 *   const handleClick = () => {
 *     void clientLogger.info('Button clicked', { buttonId: 'submit' });
 *   };
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 * ```
 */

import { isDebugEnabledClient } from './env';
import type { LogLevel, LogCategory } from '@/types/debug';

/** Shape of the JSON body sent to POST /api/debug/logs. */
interface ClientLogPayload {
  level: LogLevel;
  message: string;
  category?: LogCategory;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

async function send(payload: ClientLogPayload): Promise<void> {
  if (!isDebugEnabledClient()) return;
  try {
    await fetch('/api/debug/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Debug logging must never throw or affect the application.
  }
}

export const clientLogger = {
  debug(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'general',
    requestId?: string,
  ): Promise<void> {
    return send({ level: 'debug', message, metadata, category, requestId });
  },
  info(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'general',
    requestId?: string,
  ): Promise<void> {
    return send({ level: 'info', message, metadata, category, requestId });
  },
  warn(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'general',
    requestId?: string,
  ): Promise<void> {
    return send({ level: 'warn', message, metadata, category, requestId });
  },
  error(
    message: string,
    metadata?: Record<string, unknown>,
    category: LogCategory = 'exception',
    requestId?: string,
  ): Promise<void> {
    return send({ level: 'error', message, metadata, category, requestId });
  },
};
