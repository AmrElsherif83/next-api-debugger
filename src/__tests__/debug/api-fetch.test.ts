import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/debug/env', () => ({ isDebugEnabled: vi.fn(() => true) }));
vi.mock('@/lib/debug/log-store', () => ({ addEntry: vi.fn() }));

import { isDebugEnabled } from '@/lib/debug/env';
import { addEntry } from '@/lib/debug/log-store';
import { apiFetch } from '@/lib/debug/api-fetch';
import type { ApiCallLog } from '@/types/debug';

const mockIsDebugEnabled = isDebugEnabled as ReturnType<typeof vi.fn>;
const mockAddEntry = addEntry as ReturnType<typeof vi.fn>;

function makeResponse(status: number, body = '{}'): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  beforeEach(() => {
    mockIsDebugEnabled.mockReturnValue(true);
    mockAddEntry.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns the response on a successful 200 request', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, '{"id":1}'));

    const res = await apiFetch('https://example.com/posts/1');

    expect(res.status).toBe(200);
  });

  it('logs a single entry for a successful request', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/ok');

    expect(mockAddEntry).toHaveBeenCalledOnce();
    const entry = mockAddEntry.mock.calls[0][0];
    expect(entry.level).toBe('info');
    expect(entry.message).toContain('200');
  });

  it('logs an error entry for a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(404));

    await apiFetch('https://example.com/not-found');

    expect(mockAddEntry).toHaveBeenCalledOnce();
    const entry = mockAddEntry.mock.calls[0][0];
    expect(entry.level).toBe('error');
    expect(entry.message).toContain('404');
  });

  it('returns the non-ok response object (does not throw on 404)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(404));
    const res = await apiFetch('https://example.com/not-found');
    expect(res.status).toBe(404);
  });

  it('throws and logs an error when the network request fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    await expect(apiFetch('https://example.com/fail')).rejects.toThrow('Network error');

    const entry = mockAddEntry.mock.calls[0][0];
    expect(entry.level).toBe('error');
    expect(entry.apiCall.error).toBe('Network error');
  });

  it('masks sensitive headers in the logged entry', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/secure', {
      headers: {
        Authorization: 'Bearer super-secret-token',
        'X-Api-Key': 'my-api-key-12345',
        'Content-Type': 'application/json',
      },
    });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.requestHeaders['Authorization']).toBe('[REDACTED]');
    expect(apiCall.requestHeaders['X-Api-Key']).toBe('[REDACTED]');
    expect(apiCall.requestHeaders['Content-Type']).toBe('application/json');
  });

  it('masks sensitive headers in the generated cURL string', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/secure', {
      headers: { Authorization: 'Bearer secret', 'X-Api-Key': 'key123' },
    });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.curl).not.toContain('secret');
    expect(apiCall.curl).not.toContain('key123');
    expect(apiCall.curl).toContain('[REDACTED]');
  });

  it('records method, url, statusCode, and durationMs', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(201));

    await apiFetch('https://example.com/create', { method: 'POST' });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.method).toBe('POST');
    expect(apiCall.url).toBe('https://example.com/create');
    expect(apiCall.statusCode).toBe(201);
    expect(typeof apiCall.durationMs).toBe('number');
    expect(apiCall.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('uses the custom logCategory when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/categorised', { logCategory: 'demo' });

    expect(mockAddEntry.mock.calls[0][0].category).toBe('demo');
  });

  it('defaults method to GET when none is specified', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/default-method');

    expect(mockAddEntry.mock.calls[0][0].apiCall.method).toBe('GET');
  });

  it('bypasses logging in production and calls fetch directly', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('https://example.com/prod');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockAddEntry).not.toHaveBeenCalled();
  });
});
