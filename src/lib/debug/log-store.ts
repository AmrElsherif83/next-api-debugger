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
 */
const store: LogEntry[] = [];

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
