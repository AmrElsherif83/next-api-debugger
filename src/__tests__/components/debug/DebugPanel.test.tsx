/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LogEntry } from '@/types/debug';
import DebugPanel from '@/components/debug/DebugPanel';
import { isDebugEnabled } from '@/lib/debug/env';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    level: 'info',
    source: 'server',
    category: 'general',
    message: 'Test message',
    ...overrides,
  };
}

function mockFetch(responses: Array<{ ok: boolean; data: unknown }>) {
  let callCount = 0;
  global.fetch = vi.fn(() => {
    const resp = responses[callCount] ?? responses[responses.length - 1];
    callCount++;
    return Promise.resolve({
      ok: resp.ok,
      json: () => Promise.resolve(resp.data),
    } as Response);
  });
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('DebugPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: GET returns empty array
    mockFetch([{ ok: true, data: [] }]);
  });

  it('renders the panel header', async () => {
    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByText(/debug console/i)).toBeInTheDocument();
  });

  it('shows "No log entries" when the store is empty', async () => {
    mockFetch([{ ok: true, data: [] }]);
    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/no log entries yet/i)).toBeInTheDocument();
    });
  });

  it('renders log entries returned by the API', async () => {
    const entries = [makeEntry({ id: 'a', message: 'First entry' })];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('First entry')).toBeInTheDocument();
    });
  });

  it('renders multiple entries', async () => {
    const entries = [
      makeEntry({ id: 'a', message: 'Entry A' }),
      makeEntry({ id: 'b', message: 'Entry B', level: 'error' }),
    ];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('Entry A')).toBeInTheDocument();
      expect(screen.getByText('Entry B')).toBeInTheDocument();
    });
  });

  it('calls onClose when the ✕ button is clicked', async () => {
    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /✕/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clears entries when Clear is clicked', async () => {
    const entries = [makeEntry({ id: 'x', message: 'Will be cleared' })];
    // First call = GET (initial load), second call = DELETE (clear)
    mockFetch([
      { ok: true, data: entries },
      { ok: true, data: null },
    ]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Will be cleared')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    await waitFor(() => {
      expect(screen.getByText(/no log entries yet/i)).toBeInTheDocument();
    });
  });

  it('issues a DELETE request to /api/debug/logs when Clear is clicked', async () => {
    mockFetch([
      { ok: true, data: [] },
      { ok: true, data: null },
    ]);
    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/debug/logs', { method: 'DELETE' });
    });
  });

  it('issues a GET request to /api/debug/logs on mount', async () => {
    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/debug/logs');
    });
  });

  it('re-fetches logs when Refresh is clicked', async () => {
    const updated = [makeEntry({ id: 'new', message: 'Refreshed entry' })];
    mockFetch([
      { ok: true, data: [] },       // initial load
      { ok: true, data: updated },  // after refresh
    ]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(screen.getByText(/no log entries yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => {
      expect(screen.getByText('Refreshed entry')).toBeInTheDocument();
    });
  });

  it('renders level badge for each entry', async () => {
    const entries = [
      makeEntry({ id: '1', level: 'warn', message: 'A warning' }),
      makeEntry({ id: '2', level: 'error', message: 'An error' }),
    ];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('warn')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('renders metadata block when present', async () => {
    const entries = [makeEntry({ id: 'm', metadata: { key: 'value' } })];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/"key"/)).toBeInTheDocument();
    });
  });

  it('renders apiCall curl block when present', async () => {
    const entries = [
      makeEntry({
        id: 'c',
        apiCall: {
          method: 'GET',
          url: 'https://example.com',
          requestHeaders: {},
          statusCode: 200,
          durationMs: 42,
          curl: "curl -X GET 'https://example.com'",
        },
      }),
    ];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/curl -X GET/i)).toBeInTheDocument();
    });
  });

  it('shows Copy button inside curl block', async () => {
    const entries = [
      makeEntry({
        id: 'cp',
        apiCall: {
          method: 'GET',
          url: 'https://example.com',
          requestHeaders: {},
          curl: "curl -X GET 'https://example.com'",
        },
      }),
    ];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });
  });
});

// ── production gating ─────────────────────────────────────────────────────────

describe('DebugPanel — production gating (server-side)', () => {
  it('isDebugEnabled returns false when APP_ENV is production', () => {
    /**
     * The layout conditionally renders <DebugButton /> only when
     * isDebugEnabled() returns true. We verify the guard by stubbing
     * APP_ENV=production (which isDebugEnabled reads first) and confirming
     * the helper returns false.
     *
     * The route-level production block (403) is already covered in
     * src/__tests__/debug/route.test.ts.
     */
    vi.stubEnv('APP_ENV', 'production');
    expect(isDebugEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('isDebugEnabled returns true when APP_ENV is development', () => {
    vi.stubEnv('APP_ENV', 'development');
    expect(isDebugEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });
});
