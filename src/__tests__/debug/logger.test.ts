import { describe, it, expect, beforeEach, vi } from 'vitest';

// Must mock before importing logger so the cached module picks it up.
vi.mock('@/lib/debug/env', () => ({ isDebugEnabled: vi.fn(() => true) }));
vi.mock('@/lib/debug/log-store', () => ({
  addEntry: vi.fn(),
}));

import { isDebugEnabled } from '@/lib/debug/env';
import { addEntry } from '@/lib/debug/log-store';
import { logger } from '@/lib/debug/logger';

const mockIsDebugEnabled = isDebugEnabled as ReturnType<typeof vi.fn>;
const mockAddEntry = addEntry as ReturnType<typeof vi.fn>;

describe('logger', () => {
  beforeEach(() => {
    mockIsDebugEnabled.mockReturnValue(true);
    mockAddEntry.mockClear();
  });

  it('logger.info stores an info-level entry', () => {
    logger.info('test message', { key: 'value' });
    expect(mockAddEntry).toHaveBeenCalledOnce();
    const entry = mockAddEntry.mock.calls[0][0];
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.metadata).toEqual({ key: 'value' });
    expect(entry.category).toBe('general');
  });

  it('logger.warn stores a warn-level entry', () => {
    logger.warn('warn msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    expect(mockAddEntry.mock.calls[0][0].level).toBe('warn');
  });

  it('logger.error stores an error-level entry with default category exception', () => {
    logger.error('err msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    const entry = mockAddEntry.mock.calls[0][0];
    expect(entry.level).toBe('error');
    expect(entry.category).toBe('exception');
  });

  it('logger.debug stores a debug-level entry', () => {
    logger.debug('debug msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    expect(mockAddEntry.mock.calls[0][0].level).toBe('debug');
  });

  it('uses default category "general" for info/warn/debug when none is provided', () => {
    logger.info('no cat');
    expect(mockAddEntry.mock.calls[0][0].category).toBe('general');
  });

  it('uses a custom category when provided', () => {
    logger.info('with cat', undefined, 'response');
    expect(mockAddEntry.mock.calls[0][0].category).toBe('response');
  });

  it('defaults source to "server"', () => {
    logger.info('source check');
    expect(mockAddEntry.mock.calls[0][0].source).toBe('server');
  });

  it('accepts an explicit source of "client"', () => {
    logger.info('client log', undefined, 'general', 'client');
    expect(mockAddEntry.mock.calls[0][0].source).toBe('client');
  });

  it('stores requestId when provided', () => {
    logger.info('req', undefined, 'request', 'server', 'req-abc-123');
    expect(mockAddEntry.mock.calls[0][0].requestId).toBe('req-abc-123');
  });

  it('omits requestId from the entry when not provided', () => {
    logger.info('no req id');
    expect(mockAddEntry.mock.calls[0][0].requestId).toBeUndefined();
  });

  it('omits metadata from the entry when not provided', () => {
    logger.info('no meta');
    expect(mockAddEntry.mock.calls[0][0].metadata).toBeUndefined();
  });

  it('entry has an id and timestamp', () => {
    logger.info('ts check');
    const entry = mockAddEntry.mock.calls[0][0];
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
    expect(typeof entry.timestamp).toBe('string');
    expect(new Date(entry.timestamp).getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  it('is completely silent (no-op) in production', () => {
    mockIsDebugEnabled.mockReturnValue(false);
    logger.info('silent');
    logger.warn('silent');
    logger.error('silent');
    logger.debug('silent');
    expect(mockAddEntry).not.toHaveBeenCalled();
  });
});
