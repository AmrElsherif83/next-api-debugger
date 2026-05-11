import type { LogEntry } from '@/types/debug';

/** Maximum number of entries kept in memory to avoid unbounded growth. */
const MAX_ENTRIES = 500;

/**
 * Module-level singleton that lives for the lifetime of the Node.js process.
 * In development/test the Next.js server is a single long-lived process, so
 * entries accumulate across requests until they are cleared.
 *
 * This store is intentionally simple: it is NOT suitable for production use,
 * multi-process deployments, or persistence across server restarts.
 *
 * HMR note: in development, Next.js can re-evaluate server modules when files
 * change (Hot Module Replacement). A plain module-level array would be reset
 * to [] on each re-evaluation, losing accumulated debug entries. To prevent
 * that, the store is pinned on `globalThis` in development so it survives HMR
 * cycles. This pattern has no effect in test or production environments.
 */

/** Augmented global type used solely to namespace the HMR-stable store. */
type DebugGlobal = typeof globalThis & { __nextDebugLogStore?: LogEntry[] };

const store: LogEntry[] =
  process.env.NODE_ENV === 'development'
    ? // Pin to globalThis so the array survives Next.js HMR re-evaluation.
      ((globalThis as DebugGlobal).__nextDebugLogStore ??= [])
    : [];

export function addEntry(entry: LogEntry): void {
  store.push(entry);
  if (store.length > MAX_ENTRIES) {
    store.splice(0, store.length - MAX_ENTRIES);
  }
}

export function getEntries(): ReadonlyArray<LogEntry> {
  return store;
}

export function clearEntries(): void {
  store.splice(0, store.length);
}
