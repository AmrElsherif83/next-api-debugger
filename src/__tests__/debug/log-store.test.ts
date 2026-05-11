import { describe, it, expect, beforeEach } from 'vitest';
import { addEntry, getEntries, clearEntries } from '@/lib/debug/log-store';
import type { LogEntry } from '@/types/debug';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'app',
    message: 'test message',
    ...overrides,
  };
}

describe('log-store', () => {
  beforeEach(() => {
    clearEntries();
  });

  it('starts empty', () => {
    expect(getEntries()).toHaveLength(0);
  });

  it('addEntry stores a single entry', () => {
    const entry = makeEntry({ id: 'a1', message: 'hello' });
    addEntry(entry);
    expect(getEntries()).toHaveLength(1);
    expect(getEntries()[0]).toEqual(entry);
  });

  it('addEntry accumulates multiple entries in order', () => {
    addEntry(makeEntry({ id: '1', message: 'first' }));
    addEntry(makeEntry({ id: '2', message: 'second' }));
    const entries = getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe('first');
    expect(entries[1].message).toBe('second');
  });

  it('getEntries returns a readonly snapshot', () => {
    addEntry(makeEntry({ id: 'r1' }));
    const entries = getEntries();
    expect(entries).toHaveLength(1);
  });

  it('clearEntries empties the store', () => {
    addEntry(makeEntry({ id: 'c1' }));
    addEntry(makeEntry({ id: 'c2' }));
    clearEntries();
    expect(getEntries()).toHaveLength(0);
  });

  it('caps the store at MAX_ENTRIES (500) and discards oldest', () => {
    // Fill store to MAX_ENTRIES
    for (let i = 0; i < 500; i++) {
      addEntry(makeEntry({ id: `e${i}`, message: `entry-${i}` }));
    }
    expect(getEntries()).toHaveLength(500);
    expect(getEntries()[0].message).toBe('entry-0');

    // Add one more — oldest should be evicted
    addEntry(makeEntry({ id: 'overflow', message: 'overflow' }));
    expect(getEntries()).toHaveLength(500);
    expect(getEntries()[0].message).toBe('entry-1');
    expect(getEntries()[499].message).toBe('overflow');
  });

  it('does not grow beyond MAX_ENTRIES even when many entries are added', () => {
    for (let i = 0; i < 600; i++) {
      addEntry(makeEntry({ id: `x${i}` }));
    }
    expect(getEntries().length).toBeLessThanOrEqual(500);
  });
});
