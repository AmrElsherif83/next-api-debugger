import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LogEntry } from '@/types/debug';

vi.mock('@/lib/debug/env', () => ({ isDebugEnabled: vi.fn(() => true) }));
vi.mock('@/lib/debug/log-store', () => ({
  getEntries: vi.fn(() => []),
  clearEntries: vi.fn(),
}));

import { isDebugEnabled } from '@/lib/debug/env';
import { getEntries, clearEntries } from '@/lib/debug/log-store';
import { GET, DELETE } from '@/app/api/debug/logs/route';

const mockIsDebugEnabled = isDebugEnabled as ReturnType<typeof vi.fn>;
const mockGetEntries = getEntries as ReturnType<typeof vi.fn>;
const mockClearEntries = clearEntries as ReturnType<typeof vi.fn>;

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
