import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LogEntry } from '@/types/debug';
import { NextRequest } from 'next/server';

vi.mock('@/lib/debug/env', () => ({ isDebugEnabled: vi.fn(() => true) }));
vi.mock('@/lib/debug/log-store', () => ({
  getEntries: vi.fn(() => []),
  clearEntries: vi.fn(),
  addEntry: vi.fn(),
}));

import { isDebugEnabled } from '@/lib/debug/env';
import { getEntries, clearEntries, addEntry } from '@/lib/debug/log-store';
import { GET, POST, DELETE } from '@/app/api/debug/logs/route';

const mockIsDebugEnabled = isDebugEnabled as ReturnType<typeof vi.fn>;
const mockGetEntries = getEntries as ReturnType<typeof vi.fn>;
const mockClearEntries = clearEntries as ReturnType<typeof vi.fn>;
const mockAddEntry = addEntry as ReturnType<typeof vi.fn>;

/** Creates a NextRequest with the given JSON body for POST tests. */
function makePostReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/debug/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeEntry(id: string): LogEntry {
  return {
    id,
    timestamp: new Date().toISOString(),
    level: 'info',
    source: 'server',
    category: 'general',
    message: `entry ${id}`,
  };
}

describe('GET /api/debug/logs', () => {
  beforeEach(() => {
    mockIsDebugEnabled.mockReturnValue(true);
    mockGetEntries.mockReturnValue([]);
    mockClearEntries.mockClear();
  });

  it('returns 200 with an empty array when no logs exist', async () => {
    mockGetEntries.mockReturnValue([]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it('returns 200 with existing log entries', async () => {
    const entries = [makeEntry('1'), makeEntry('2')];
    mockGetEntries.mockReturnValue(entries);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe('1');
    expect(body[1].id).toBe('2');
  });

  it('returns 403 in production', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('does not call getEntries in production', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    await GET();
    expect(mockGetEntries).not.toHaveBeenCalled();
  });
});

describe('POST /api/debug/logs', () => {
  beforeEach(() => {
    mockIsDebugEnabled.mockReturnValue(true);
    mockAddEntry.mockClear();
  });

  it('returns 201 and the stored entry for a valid payload', async () => {
    const req = makePostReq({ level: 'info', message: 'hello from browser' });
    const response = await POST(req);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.level).toBe('info');
    expect(body.message).toBe('hello from browser');
    expect(body.source).toBe('client');
    expect(typeof body.id).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });

  it('forces source to "client" regardless of what the caller sends', async () => {
    const req = makePostReq({ level: 'warn', message: 'spoof attempt', source: 'server' });
    const response = await POST(req);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.source).toBe('client');
  });

  it('calls addEntry with source "client"', async () => {
    const req = makePostReq({ level: 'debug', message: 'test' });
    await POST(req);
    expect(mockAddEntry).toHaveBeenCalledOnce();
    const entry: LogEntry = mockAddEntry.mock.calls[0][0];
    expect(entry.source).toBe('client');
  });

  it('stores metadata when provided', async () => {
    const req = makePostReq({ level: 'info', message: 'meta test', metadata: { foo: 'bar' } });
    await POST(req);
    const entry: LogEntry = mockAddEntry.mock.calls[0][0];
    expect(entry.metadata).toEqual({ foo: 'bar' });
  });

  it('stores requestId when provided', async () => {
    const req = makePostReq({ level: 'info', message: 'rid test', requestId: 'req-123' });
    await POST(req);
    const entry: LogEntry = mockAddEntry.mock.calls[0][0];
    expect(entry.requestId).toBe('req-123');
  });

  it('uses default category "general" when omitted', async () => {
    const req = makePostReq({ level: 'info', message: 'cat default' });
    await POST(req);
    const entry: LogEntry = mockAddEntry.mock.calls[0][0];
    expect(entry.category).toBe('general');
  });

  it('accepts a custom category', async () => {
    const req = makePostReq({ level: 'info', message: 'cat test', category: 'response' });
    await POST(req);
    const entry: LogEntry = mockAddEntry.mock.calls[0][0];
    expect(entry.category).toBe('response');
  });

  it('returns 400 when level is missing', async () => {
    const req = makePostReq({ message: 'no level' });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when level is invalid', async () => {
    const req = makePostReq({ level: 'verbose', message: 'bad level' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when message is empty', async () => {
    const req = makePostReq({ level: 'info', message: '' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when message exceeds 2000 characters', async () => {
    const req = makePostReq({ level: 'info', message: 'x'.repeat(2001) });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when category is invalid', async () => {
    const req = makePostReq({ level: 'info', message: 'bad cat', category: 'unknown' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when metadata is an array', async () => {
    const req = makePostReq({ level: 'info', message: 'bad meta', metadata: [1, 2] });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when metadata exceeds 50 keys', async () => {
    const metadata = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, i]));
    const req = makePostReq({ level: 'info', message: 'too many keys', metadata });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/debug/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when body is an array (not an object)', async () => {
    const req = makePostReq([{ level: 'info', message: 'array' }]);
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 403 in production (production is blocked)', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    const req = makePostReq({ level: 'info', message: 'prod' });
    const response = await POST(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('does not call addEntry in production', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    const req = makePostReq({ level: 'info', message: 'prod silent' });
    await POST(req);
    expect(mockAddEntry).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/debug/logs', () => {
  beforeEach(() => {
    mockIsDebugEnabled.mockReturnValue(true);
    mockClearEntries.mockClear();
  });

  it('returns 200 with { cleared: true }', async () => {
    const response = await DELETE();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ cleared: true });
  });

  it('calls clearEntries', async () => {
    await DELETE();
    expect(mockClearEntries).toHaveBeenCalledOnce();
  });

  it('returns 403 in production', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    const response = await DELETE();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('does not call clearEntries in production', async () => {
    mockIsDebugEnabled.mockReturnValue(false);
    await DELETE();
    expect(mockClearEntries).not.toHaveBeenCalled();
  });
});
