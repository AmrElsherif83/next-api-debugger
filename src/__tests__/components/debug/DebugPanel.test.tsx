/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LogEntry } from '@/types/debug';
import DebugPanel, { POLL_INTERVAL_MS } from '@/components/debug/DebugPanel';
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
      const badges = screen.getAllByTestId('log-level-badge');
      expect(badges.find((b) => b.textContent === 'warn')).toBeTruthy();
      expect(badges.find((b) => b.textContent === 'error')).toBeTruthy();
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

// ── source field ─────────────────────────────────────────────────────────────

describe('DebugPanel — source field', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the source field for each entry', async () => {
    const entries = [makeEntry({ id: 's1', source: 'server' })];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('[server]')).toBeInTheDocument();
    });
  });

  it('displays "client" as the source when entry source is client', async () => {
    const entries = [makeEntry({ id: 's2', source: 'client' })];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('[client]')).toBeInTheDocument();
    });
  });
});

// ── level filter ──────────────────────────────────────────────────────────────

describe('DebugPanel — level filter', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter buttons for each level', async () => {
    mockFetch([{ ok: true, data: [] }]);
    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /show all levels/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by debug/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by info/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by warn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by error/i })).toBeInTheDocument();
  });

  it('hides non-matching entries when a level filter is applied', async () => {
    const entries = [
      makeEntry({ id: '1', level: 'info', message: 'Info message' }),
      makeEntry({ id: '2', level: 'error', message: 'Error message' }),
    ];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /filter by error/i }));

    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('shows all entries when the "All" filter is selected after a level filter', async () => {
    const entries = [
      makeEntry({ id: '1', level: 'info', message: 'Info message' }),
      makeEntry({ id: '2', level: 'error', message: 'Error message' }),
    ];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Info message')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /filter by error/i }));
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show all levels/i }));
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('shows "No log entries yet." when filter matches nothing', async () => {
    const entries = [makeEntry({ id: '1', level: 'info', message: 'Info only' })];
    mockFetch([{ ok: true, data: entries }]);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Info only')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /filter by error/i }));

    expect(screen.getByText(/no log entries yet/i)).toBeInTheDocument();
  });
});

// ── safe failure ──────────────────────────────────────────────────────────────

describe('DebugPanel — safe failure', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error banner when fetch throws (endpoint unavailable)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/debug endpoint unavailable/i)).toBeInTheDocument();
    });
  });

  it('does not crash when fetch throws — panel remains mounted', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/debug console/i)).toBeInTheDocument();
    });
  });

  it('shows an error banner when the API returns a non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({}),
    } as unknown as Response);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/403 Forbidden/)).toBeInTheDocument();
    });
  });

  it('clears the error banner after a subsequent successful fetch', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve([]),
      } as unknown as Response);

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(screen.getByText(/503/)).toBeInTheDocument());

    // Trigger a successful refresh
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => {
      expect(screen.queryByText(/503/)).not.toBeInTheDocument();
    });
  });
});

// ── polling ───────────────────────────────────────────────────────────────────

describe('DebugPanel — polling', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch([{ ok: true, data: [] }]);
  });

  it(`sets up a polling interval of ${POLL_INTERVAL_MS} ms on mount`, async () => {
    const spy = vi.spyOn(global, 'setInterval');

    render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledWith(expect.any(Function), POLL_INTERVAL_MS);
    spy.mockRestore();
  });

  it('clears the polling interval when the component unmounts', async () => {
    const spy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(<DebugPanel onClose={onClose} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('re-fetches logs when the interval callback fires', async () => {
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as unknown as Response);

      render(<DebugPanel onClose={onClose} />);

      // Drain the initial mount fetch
      await vi.advanceTimersByTimeAsync(0);
      const callsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

      // Advance past the poll interval — fires the setInterval callback
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS + 50);

      // Fetch should have been called again by the interval
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    } finally {
      vi.useRealTimers();
    }
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
