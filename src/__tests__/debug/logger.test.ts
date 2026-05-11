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
    expect(entry.data).toEqual({ key: 'value' });
    expect(entry.category).toBe('app');
  });

  it('logger.warn stores a warn-level entry', () => {
    logger.warn('warn msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    expect(mockAddEntry.mock.calls[0][0].level).toBe('warn');
  });

  it('logger.error stores an error-level entry', () => {
    logger.error('err msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    expect(mockAddEntry.mock.calls[0][0].level).toBe('error');
  });

  it('logger.debug stores a debug-level entry', () => {
    logger.debug('debug msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    expect(mockAddEntry.mock.calls[0][0].level).toBe('debug');
  });

  it('logger.log stores a log-level entry', () => {
    logger.log('log msg');
    expect(mockAddEntry).toHaveBeenCalledOnce();
    expect(mockAddEntry.mock.calls[0][0].level).toBe('log');
  });

  it('uses default category "app" when none is provided', () => {
    logger.info('no cat');
    expect(mockAddEntry.mock.calls[0][0].category).toBe('app');
  });

  it('uses a custom category when provided', () => {
    logger.info('with cat', undefined, 'demo');
    expect(mockAddEntry.mock.calls[0][0].category).toBe('demo');
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
    logger.log('silent');
    expect(mockAddEntry).not.toHaveBeenCalled();
  });
});
