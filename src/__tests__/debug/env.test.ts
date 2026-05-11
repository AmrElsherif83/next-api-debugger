import { describe, it, expect, afterEach, vi } from 'vitest';
import { isDebugEnabled } from '@/lib/debug/env';

describe('isDebugEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isDebugEnabled()).toBe(true);
  });

  it('returns true in test', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(isDebugEnabled()).toBe(true);
  });

  it('returns false in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isDebugEnabled()).toBe(false);
  });

  it('returns false for unknown environments', () => {
    vi.stubEnv('NODE_ENV', 'staging');
    expect(isDebugEnabled()).toBe(false);
  });
});
