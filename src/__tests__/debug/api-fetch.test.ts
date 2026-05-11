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

    await apiFetch('https://example.com/categorised', { logCategory: 'response' });

    expect(mockAddEntry.mock.calls[0][0].category).toBe('response');
  });

  it('defaults category to "request" when none is specified', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/default-category');

    expect(mockAddEntry.mock.calls[0][0].category).toBe('request');
  });

  it('defaults method to GET when none is specified', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/default-method');

    expect(mockAddEntry.mock.calls[0][0].apiCall.method).toBe('GET');
  });

  it('sets source to "server" on every entry', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/source');

    expect(mockAddEntry.mock.calls[0][0].source).toBe('server');
  });

  it('sets a requestId on every entry', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/reqid');

    const entry = mockAddEntry.mock.calls[0][0];
    expect(typeof entry.requestId).toBe('string');
    expect(entry.requestId.length).toBeGreaterThan(0);
  });

  it('bypasses logging in production and calls fetch directly', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('https://example.com/prod');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockAddEntry).not.toHaveBeenCalled();
  });

  // ── ApiFetchOptions (third parameter) ────────────────────────────────────

  it('uses the category from ApiFetchOptions when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com', {}, { category: 'response' });

    expect(mockAddEntry.mock.calls[0][0].category).toBe('response');
  });

  it('ApiFetchOptions.category takes precedence over init.logCategory', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com', { logCategory: 'general' }, { category: 'response' });

    expect(mockAddEntry.mock.calls[0][0].category).toBe('response');
  });

  it('falls back to init.logCategory when options.category is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com', { logCategory: 'general' }, {});

    expect(mockAddEntry.mock.calls[0][0].category).toBe('general');
  });

  it('prepends the label to the log message when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com', {}, { label: 'fetchUser' });

    expect(mockAddEntry.mock.calls[0][0].message).toContain('[fetchUser]');
  });

  it('does not add a label prefix when label is omitted', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com/no-label');

    expect(mockAddEntry.mock.calls[0][0].message).not.toMatch(/^\[/);
  });

  it('stores a truncated bodyPreview when bodyPreviewLimit is set', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));
    const body = 'x'.repeat(200);

    await apiFetch('https://example.com', { method: 'POST', body }, { bodyPreviewLimit: 50 });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.bodyPreview).toBeDefined();
    expect(apiCall.bodyPreview!.length).toBeLessThanOrEqual(51); // 50 chars + ellipsis
    expect(apiCall.bodyPreview).toContain('…');
  });

  it('does not store bodyPreview when bodyPreviewLimit is omitted', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    await apiFetch('https://example.com', { method: 'POST', body: '{"x":1}' });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.bodyPreview).toBeUndefined();
  });

  it('stores the full body in bodyPreview when it is within the limit', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));
    const body = 'short body';

    await apiFetch('https://example.com', { method: 'POST', body }, { bodyPreviewLimit: 100 });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.bodyPreview).toBe('short body');
  });

  it('stores a truncated responsePreview when responsePreviewLimit is set', async () => {
    const longBody = 'r'.repeat(300);
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, longBody));

    await apiFetch('https://example.com', {}, { responsePreviewLimit: 100 });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.responsePreview).toBeDefined();
    expect(apiCall.responsePreview!.length).toBeLessThanOrEqual(101); // 100 chars + ellipsis
    expect(apiCall.responsePreview).toContain('…');
  });

  it('does not store responsePreview when responsePreviewLimit is omitted', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, '{"data":1}'));

    await apiFetch('https://example.com');

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.responsePreview).toBeUndefined();
  });

  it('stores the full response body in responsePreview when it is within the limit', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, '{"ok":true}'));

    await apiFetch('https://example.com', {}, { responsePreviewLimit: 500 });

    const apiCall: ApiCallLog = mockAddEntry.mock.calls[0][0].apiCall;
    expect(apiCall.responsePreview).toBe('{"ok":true}');
  });

  it('still returns the original Response when responsePreviewLimit is set', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, '{"id":42}'));

    const res = await apiFetch('https://example.com', {}, { responsePreviewLimit: 50 });

    // Caller can still consume the response normally.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 42 });
  });
});
