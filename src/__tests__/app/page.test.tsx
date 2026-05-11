/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Must be established before the SUT is imported.

vi.mock('@/lib/debug/api-fetch', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/lib/debug/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { apiFetch } from '@/lib/debug/api-fetch';
import { logger } from '@/lib/debug/logger';
import HomePage from '@/app/page';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function makeJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    clone: () => makeJsonResponse(data, status),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Default "success" stub: post/1 → 200, posts/9999 → 200, users/1 → 200. */
function stubAllSuccess() {
  mockApiFetch.mockResolvedValue(
    makeJsonResponse({ id: 1, title: 'Demo post title', body: 'Demo post body.' }),
  );
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('HomePage — success path', () => {
  beforeEach(() => {
    stubAllSuccess();
  });

  it('renders the page heading', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.getByRole('heading', { name: /next api debugger/i })).toBeInTheDocument();
  });

  it('renders the fetched post when the API call succeeds', async () => {
    const ui = await HomePage();
    render(ui);
    // The post JSON is rendered inside a <pre> block.
    expect(screen.getByText(/"id"/)).toBeInTheDocument();
    expect(screen.getByText(/"Demo post title"/)).toBeInTheDocument();
  });

  it('does not show the failure message on the success path', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByText(/failed to load post/i)).not.toBeInTheDocument();
  });

  it('calls logger.info at least once during render', async () => {
    await HomePage();
    expect(logger.info).toHaveBeenCalled();
  });

  it('calls logger.debug with environment info', async () => {
    await HomePage();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/environment/i),
      expect.objectContaining({ nodeEnv: expect.any(String) }),
    );
  });

  it('calls logger.info with "Fetched post successfully" on the success path', async () => {
    await HomePage();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/fetched post successfully/i),
      expect.any(Object),
      'response',
    );
  });

  it('calls logger.warn at the end of the render', async () => {
    await HomePage();
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('HomePage — failure path', () => {
  beforeEach(() => {
    // First call (posts/1) throws so the post section shows the failure message.
    // Subsequent calls (posts/9999, users/1) are swallowed by the page's own try/catch.
    mockApiFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(makeJsonResponse({}));
  });

  it('renders "Failed to load post" when the first API call throws', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.getByText(/failed to load post/i)).toBeInTheDocument();
  });

  it('does not render the post JSON block when the API call fails', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByText(/"Demo post title"/)).not.toBeInTheDocument();
  });

  it('calls logger.error when the post fetch throws', async () => {
    await HomePage();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/failed to fetch post/i),
      expect.any(Object),
      'exception',
    );
  });
});

describe('HomePage — masked sensitive headers', () => {
  beforeEach(() => {
    stubAllSuccess();
  });

  /**
   * The page fires a request with Authorization + X-Api-Key headers.
   * apiFetch (tested independently in api-fetch.test.ts) masks those values.
   * Here we just verify that the page passes those headers to apiFetch so
   * the masking logic is exercised on every render.
   */
  it('passes Authorization and X-Api-Key headers to apiFetch for the users call', async () => {
    await HomePage();

    const calls = mockApiFetch.mock.calls as Array<[string, ...unknown[]]>;
    const usersCall = calls.find(([url]) => String(url).includes('/users/'));
    expect(usersCall).toBeDefined();
    const headers = (usersCall![1] as RequestInit & { headers: Record<string, string> }).headers;
    expect(Object.keys(headers)).toContain('Authorization');
    expect(Object.keys(headers)).toContain('X-Api-Key');
  });
});

describe('HomePage — structure', () => {
  beforeEach(() => {
    stubAllSuccess();
  });

  it('renders the "How to use the debug console" section', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.getByText(/how to use the debug console/i)).toBeInTheDocument();
  });

  it('mentions the 🛠 button in the instructions', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.getByText(/🛠/)).toBeInTheDocument();
  });

  it('mentions that the button is hidden in production', async () => {
    const ui = await HomePage();
    render(ui);
    expect(screen.getByText(/hidden automatically in production/i)).toBeInTheDocument();
  });
});
