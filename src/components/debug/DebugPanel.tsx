'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LogEntry, LogLevel } from '@/types/debug';

/** How often the panel automatically re-fetches logs (milliseconds). */
export const POLL_INTERVAL_MS = 5_000;

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-purple-400',
};

const LEVEL_BADGE: Record<string, string> = {
  info: 'bg-blue-900 text-blue-300',
  warn: 'bg-yellow-900 text-yellow-300',
  error: 'bg-red-900 text-red-300',
  debug: 'bg-purple-900 text-purple-300',
};

const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

interface Props {
  onClose: () => void;
}

export default function DebugPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  /**
   * Loads logs without touching the loading state — safe to call from
   * useEffect (initial mount) and from the polling interval.
   * All setState calls are deferred to `finally` so the React Compiler
   * does not flag this as a synchronous-setState-in-effect pattern.
   */
  const loadLogs = useCallback(async () => {
    let errorMsg: string | null = null;
    let nextEntries: LogEntry[] | null = null;
    try {
      const res = await fetch('/api/debug/logs');
      if (!res.ok) {
        errorMsg = `Debug API returned ${res.status}`;
      } else {
        nextEntries = (await res.json()) as LogEntry[];
      }
    } catch {
      errorMsg = 'Debug endpoint unavailable';
    } finally {
      if (nextEntries !== null) setEntries(nextEntries);
      setFetchError(errorMsg);
      setLoading(false);
    }
  }, []);

  /** Called by the Refresh button (event handler) — may set loading state freely. */
  const refreshLogs = useCallback(async () => {
    setLoading(true);
    await loadLogs();
  }, [loadLogs]);

  const clearLogs = useCallback(async () => {
    await fetch('/api/debug/logs', { method: 'DELETE' });
    setEntries([]);
  }, []);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  // Fetch on first render and poll every POLL_INTERVAL_MS.
  useEffect(() => {
    void loadLogs();
    const id = setInterval(loadLogs, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadLogs]);

  const filteredEntries = levelFilter
    ? entries.filter((e) => e.level === levelFilter)
    : entries;

  return (
    <div className="fixed bottom-14 right-4 z-50 flex flex-col w-[680px] max-w-[95vw] h-[480px] bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <span className="text-gray-200 font-semibold tracking-wide">🛠 Debug Console</span>
        <div className="flex gap-2">
          <button
            onClick={refreshLogs}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition"
          >
            {loading ? '…' : '↻ Refresh'}
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-200 rounded transition"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Level filter bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 border-b border-gray-800">
        <span className="text-gray-500 text-[10px]">Level:</span>
        <button
          onClick={() => setLevelFilter('')}
          aria-label="Show all levels"
          className={`px-2 py-0.5 text-[10px] rounded transition ${levelFilter === '' ? 'bg-gray-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          All
        </button>
        {ALL_LEVELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            aria-label={`Filter by ${lvl}`}
            className={`px-2 py-0.5 text-[10px] rounded transition ${levelFilter === lvl ? (LEVEL_BADGE[lvl] ?? 'bg-gray-500 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Error banner — shown when the debug endpoint is unavailable */}
      {fetchError !== null && (
        <div className="px-4 py-1.5 bg-red-950 border-b border-red-800 text-red-400 text-[10px]">
          ⚠ {fetchError}
        </div>
      )}

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {filteredEntries.length === 0 && !loading && (
          <p className="text-gray-500 text-center mt-8">No log entries yet.</p>
        )}
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="border border-gray-800 rounded-lg p-3 bg-gray-900 space-y-1"
          >
            {/* Row 1: badge + timestamp + source + category + message */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                data-testid="log-level-badge"
                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${LEVEL_BADGE[entry.level] ?? 'bg-gray-700 text-gray-300'}`}
              >
                {entry.level}
              </span>
              <span className="text-gray-500 text-[10px]">{entry.timestamp}</span>
              <span className="text-gray-400 text-[10px]">[{entry.source}]</span>
              <span className="text-gray-400 text-[10px] italic">[{entry.category}]</span>
              <span className={`flex-1 truncate ${LEVEL_COLORS[entry.level] ?? 'text-gray-300'}`}>
                {entry.message}
              </span>
            </div>

            {/* Row 2: extra metadata */}
            {entry.metadata !== undefined && (
              <pre className="text-[10px] text-gray-400 bg-gray-950 rounded p-2 overflow-x-auto">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            )}

            {/* Row 3: API call details */}
            {entry.apiCall && (
              <div className="space-y-1 mt-1">
                <div className="flex gap-3 text-[10px] text-gray-400 flex-wrap">
                  <span>
                    <span className="text-gray-500">Method:</span>{' '}
                    <span className="text-white">{entry.apiCall.method}</span>
                  </span>
                  {entry.apiCall.statusCode !== undefined && (
                    <span>
                      <span className="text-gray-500">Status:</span>{' '}
                      <span
                        className={
                          entry.apiCall.statusCode >= 400 ? 'text-red-400' : 'text-green-400'
                        }
                      >
                        {entry.apiCall.statusCode}
                      </span>
                    </span>
                  )}
                  {entry.apiCall.durationMs !== undefined && (
                    <span>
                      <span className="text-gray-500">Duration:</span>{' '}
                      <span className="text-white">{entry.apiCall.durationMs} ms</span>
                    </span>
                  )}
                </div>

                {/* cURL block */}
                {entry.apiCall.curl !== undefined && (
                  <div className="relative">
                    <pre className="text-[10px] text-green-300 bg-gray-950 rounded p-2 overflow-x-auto pr-16">
                      {entry.apiCall.curl}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(entry.apiCall!.curl!, entry.id)}
                      className="absolute top-1.5 right-1.5 px-2 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
                    >
                      {copiedId === entry.id ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Error */}
                {entry.apiCall.error && (
                  <p className="text-[10px] text-red-400">Error: {entry.apiCall.error}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
