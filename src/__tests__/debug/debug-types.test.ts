/**
 * Tests for src/types/debug.ts
 *
 * TypeScript types are erased at runtime, so these tests verify:
 *   1. That valid object shapes are accepted by the type system (compile-time,
 *      enforced by the typecheck script).
 *   2. That runtime objects conforming to the contracts have the expected
 *      structure and field semantics.
 */
import { describe, it, expect } from 'vitest';
import type { LogLevel, LogSource, LogCategory, ApiCallLog, LogEntry } from '@/types/debug';

// ---------------------------------------------------------------------------
// Helpers – valid instances used across multiple tests
// ---------------------------------------------------------------------------

const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const VALID_LOG_SOURCES: LogSource[] = ['server', 'client'];
const VALID_LOG_CATEGORIES: LogCategory[] = ['general', 'request', 'response', 'exception'];

function makeApiCallLog(overrides: Partial<ApiCallLog> = {}): ApiCallLog {
  return {
    method: 'GET',
    url: 'https://api.example.com/items',
    requestHeaders: { 'Content-Type': 'application/json' },
    ...overrides,
  };
}

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    timestamp: '2025-01-01T00:00:00.000Z',
    level: 'info',
    source: 'server',
    category: 'general',
    message: 'Test log entry',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// LogLevel
// ---------------------------------------------------------------------------

describe('LogLevel', () => {
  it('accepts all four valid log levels', () => {
    expect(VALID_LOG_LEVELS).toHaveLength(4);
    expect(VALID_LOG_LEVELS).toContain('debug');
    expect(VALID_LOG_LEVELS).toContain('info');
    expect(VALID_LOG_LEVELS).toContain('warn');
    expect(VALID_LOG_LEVELS).toContain('error');
  });

  it('does not include the removed "log" level', () => {
    expect(VALID_LOG_LEVELS).not.toContain('log');
  });
});

// ---------------------------------------------------------------------------
// LogSource
// ---------------------------------------------------------------------------

describe('LogSource', () => {
  it('accepts "server"', () => {
    const source: LogSource = 'server';
    expect(source).toBe('server');
  });

  it('accepts "client"', () => {
    const source: LogSource = 'client';
    expect(source).toBe('client');
  });

  it('contains exactly two valid sources', () => {
    expect(VALID_LOG_SOURCES).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// LogCategory
// ---------------------------------------------------------------------------

describe('LogCategory', () => {
  it('accepts all four valid categories', () => {
    expect(VALID_LOG_CATEGORIES).toHaveLength(4);
    expect(VALID_LOG_CATEGORIES).toContain('general');
    expect(VALID_LOG_CATEGORIES).toContain('request');
    expect(VALID_LOG_CATEGORIES).toContain('response');
    expect(VALID_LOG_CATEGORIES).toContain('exception');
  });

  it('does not include the old "app" or "api" string categories', () => {
    expect(VALID_LOG_CATEGORIES).not.toContain('app');
    expect(VALID_LOG_CATEGORIES).not.toContain('api');
  });
});

// ---------------------------------------------------------------------------
// ApiCallLog
// ---------------------------------------------------------------------------

describe('ApiCallLog', () => {
  it('creates a minimal valid ApiCallLog with only required fields', () => {
    const log = makeApiCallLog();
    expect(log.method).toBe('GET');
    expect(log.url).toBe('https://api.example.com/items');
    expect(log.requestHeaders).toEqual({ 'Content-Type': 'application/json' });
  });

  it('statusCode is optional — absent by default', () => {
    const log = makeApiCallLog();
    expect(log.statusCode).toBeUndefined();
  });

  it('statusCode is accepted when provided', () => {
    const log = makeApiCallLog({ statusCode: 200 });
    expect(log.statusCode).toBe(200);
  });

  it('durationMs is optional — absent by default', () => {
    const log = makeApiCallLog();
    expect(log.durationMs).toBeUndefined();
  });

  it('durationMs is accepted when provided', () => {
    const log = makeApiCallLog({ durationMs: 42 });
    expect(log.durationMs).toBe(42);
  });

  it('curl is optional — absent by default', () => {
    const log = makeApiCallLog();
    expect(log.curl).toBeUndefined();
  });

  it('curl is accepted when provided', () => {
    const log = makeApiCallLog({ curl: "curl -X GET 'https://api.example.com/items'" });
    expect(log.curl).toContain('curl -X GET');
  });

  it('error is optional — absent by default', () => {
    const log = makeApiCallLog();
    expect(log.error).toBeUndefined();
  });

  it('error is accepted when provided', () => {
    const log = makeApiCallLog({ error: 'Network timeout' });
    expect(log.error).toBe('Network timeout');
  });

  it('requestHeaders is a Record<string, string>', () => {
    const log = makeApiCallLog({
      requestHeaders: { Authorization: '[REDACTED]', 'Content-Type': 'application/json' },
    });
    expect(log.requestHeaders['Authorization']).toBe('[REDACTED]');
    expect(log.requestHeaders['Content-Type']).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// LogEntry
// ---------------------------------------------------------------------------

describe('LogEntry', () => {
  it('creates a minimal valid LogEntry with all required fields', () => {
    const entry = makeLogEntry();
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.level).toBe('info');
    expect(entry.source).toBe('server');
    expect(entry.category).toBe('general');
    expect(entry.message).toBeTruthy();
  });

  it('id is a non-empty string', () => {
    const entry = makeLogEntry({ id: 'uuid-1234' });
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it('timestamp is an ISO 8601 string', () => {
    const ts = new Date().toISOString();
    const entry = makeLogEntry({ timestamp: ts });
    expect(new Date(entry.timestamp).toISOString()).toBe(ts);
  });

  it('accepts all valid log levels', () => {
    for (const level of VALID_LOG_LEVELS) {
      const entry = makeLogEntry({ level });
      expect(entry.level).toBe(level);
    }
  });

  it('accepts all valid sources', () => {
    for (const source of VALID_LOG_SOURCES) {
      const entry = makeLogEntry({ source });
      expect(entry.source).toBe(source);
    }
  });

  it('accepts all valid categories', () => {
    for (const category of VALID_LOG_CATEGORIES) {
      const entry = makeLogEntry({ category });
      expect(entry.category).toBe(category);
    }
  });

  it('metadata is optional — absent by default', () => {
    const entry = makeLogEntry();
    expect(entry.metadata).toBeUndefined();
  });

  it('metadata is accepted when provided', () => {
    const entry = makeLogEntry({ metadata: { userId: 42, action: 'login' } });
    expect(entry.metadata).toEqual({ userId: 42, action: 'login' });
  });

  it('metadata accepts nested objects', () => {
    const entry = makeLogEntry({ metadata: { request: { body: { id: 1 } } } });
    expect((entry.metadata?.request as Record<string, unknown>)?.body).toEqual({ id: 1 });
  });

  it('apiCall is optional — absent by default', () => {
    const entry = makeLogEntry();
    expect(entry.apiCall).toBeUndefined();
  });

  it('apiCall is accepted when provided', () => {
    const apiCall = makeApiCallLog({ statusCode: 201, durationMs: 100 });
    const entry = makeLogEntry({ apiCall });
    expect(entry.apiCall?.statusCode).toBe(201);
    expect(entry.apiCall?.durationMs).toBe(100);
  });

  it('requestId is optional — absent by default', () => {
    const entry = makeLogEntry();
    expect(entry.requestId).toBeUndefined();
  });

  it('requestId is accepted when provided', () => {
    const entry = makeLogEntry({ requestId: 'req-00112233' });
    expect(entry.requestId).toBe('req-00112233');
  });

  it('two entries with the same requestId can be created for grouping', () => {
    const rid = 'shared-request-id';
    const req = makeLogEntry({ id: 'e1', category: 'request', requestId: rid });
    const res = makeLogEntry({ id: 'e2', category: 'response', requestId: rid });
    expect(req.requestId).toBe(res.requestId);
  });
});

// ---------------------------------------------------------------------------
// Production-gating: production environments must not expose debug data
// ---------------------------------------------------------------------------

describe('production gating (env check)', () => {
  it('isDebugEnabled returns false for NODE_ENV=production', async () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error – intentionally overriding read-only env for test
    process.env.NODE_ENV = 'production';
    const { isDebugEnabled } = await import('@/lib/debug/env');
    expect(isDebugEnabled()).toBe(false);
    // @ts-expect-error – restore
    process.env.NODE_ENV = original;
  });
});
