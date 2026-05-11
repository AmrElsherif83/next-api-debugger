/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('@/lib/debug/env', () => ({ isDebugEnabledClient: vi.fn(() => true) }));

import { isDebugEnabledClient } from '@/lib/debug/env';
import { clientLogger } from '@/lib/debug/client-logger';

const mockIsDebugEnabledClient = isDebugEnabledClient as ReturnType<typeof vi.fn>;

describe('clientLogger', () => {
  beforeEach(() => {
    mockIsDebugEnabledClient.mockReturnValue(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // All four log levels
  // -------------------------------------------------------------------------

  it('clientLogger.debug POSTs with level "debug"', async () => {
    await clientLogger.debug('debug msg');
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/debug/logs');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.level).toBe('debug');
    expect(body.message).toBe('debug msg');
  });

  it('clientLogger.info POSTs with level "info"', async () => {
    await clientLogger.info('info msg');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.level).toBe('info');
  });

  it('clientLogger.warn POSTs with level "warn"', async () => {
    await clientLogger.warn('warn msg');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.level).toBe('warn');
  });

  it('clientLogger.error POSTs with level "error"', async () => {
    await clientLogger.error('error msg');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.level).toBe('error');
  });

  // -------------------------------------------------------------------------
  // Payload fields
  // -------------------------------------------------------------------------

  it('includes metadata when provided', async () => {
    await clientLogger.info('meta test', { userId: 42 });
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.metadata).toEqual({ userId: 42 });
  });

  it('includes category when provided', async () => {
    await clientLogger.info('cat test', undefined, 'request');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.category).toBe('request');
  });

  it('includes requestId when provided', async () => {
    await clientLogger.info('rid test', undefined, 'general', 'req-abc');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.requestId).toBe('req-abc');
  });

  it('defaults category to "general" for debug/info/warn', async () => {
    await clientLogger.info('default cat');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.category).toBe('general');
  });

  it('defaults category to "exception" for error', async () => {
    await clientLogger.error('default exception cat');
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1]
        .body as string,
    );
    expect(body.category).toBe('exception');
  });

  it('sends Content-Type: application/json header', async () => {
    await clientLogger.info('header test');
    const init = ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ])[1];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  // -------------------------------------------------------------------------
  // Production / disabled guard
  // -------------------------------------------------------------------------

  it('is a no-op (does not call fetch) when debug is disabled (production is blocked)', async () => {
    mockIsDebugEnabledClient.mockReturnValue(false);
    await clientLogger.info('silent');
    await clientLogger.warn('silent');
    await clientLogger.error('silent');
    await clientLogger.debug('silent');
    expect(fetch).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Network failure resilience
  // -------------------------------------------------------------------------

  it('does not throw when the fetch call rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );
    await expect(clientLogger.info('network fail')).resolves.toBeUndefined();
  });

  it('does not throw when the server returns a non-201 status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"error":"bad"}', { status: 400 })),
    );
    await expect(clientLogger.info('bad status')).resolves.toBeUndefined();
  });
});
