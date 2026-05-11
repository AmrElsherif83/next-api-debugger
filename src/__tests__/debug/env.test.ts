import { describe, it, expect, afterEach, vi } from 'vitest';
import { isDebugEnabled, isDebugEnabledServer, isDebugEnabledClient } from '@/lib/debug/env';

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// isDebugEnabledServer
// ---------------------------------------------------------------------------
describe('isDebugEnabledServer', () => {
  describe('when APP_ENV is set', () => {
    it('returns true for APP_ENV=local', () => {
      vi.stubEnv('APP_ENV', 'local');
      expect(isDebugEnabledServer()).toBe(true);
    });

    it('returns true for APP_ENV=development', () => {
      vi.stubEnv('APP_ENV', 'development');
      expect(isDebugEnabledServer()).toBe(true);
    });

    it('returns true for APP_ENV=test', () => {
      vi.stubEnv('APP_ENV', 'test');
      expect(isDebugEnabledServer()).toBe(true);
    });

    it('returns false for APP_ENV=production (production is blocked)', () => {
      vi.stubEnv('APP_ENV', 'production');
      expect(isDebugEnabledServer()).toBe(false);
    });

    it('returns false for unknown APP_ENV values', () => {
      vi.stubEnv('APP_ENV', 'staging');
      expect(isDebugEnabledServer()).toBe(false);
    });

    it('prefers APP_ENV over NODE_ENV', () => {
      vi.stubEnv('APP_ENV', 'production');
      vi.stubEnv('NODE_ENV', 'development');
      expect(isDebugEnabledServer()).toBe(false);
    });
  });

  describe('when APP_ENV is not set (falls back to NODE_ENV)', () => {
    it('returns true for NODE_ENV=development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(isDebugEnabledServer()).toBe(true);
    });

    it('returns true for NODE_ENV=test', () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(isDebugEnabledServer()).toBe(true);
    });

    it('returns false for NODE_ENV=production (production is blocked)', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(isDebugEnabledServer()).toBe(false);
    });

    it('returns false for unknown NODE_ENV values', () => {
      vi.stubEnv('NODE_ENV', 'staging');
      expect(isDebugEnabledServer()).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isDebugEnabledClient
// ---------------------------------------------------------------------------
describe('isDebugEnabledClient', () => {
  it('returns true for NEXT_PUBLIC_APP_ENV=local', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'local');
    expect(isDebugEnabledClient()).toBe(true);
  });

  it('returns true for NEXT_PUBLIC_APP_ENV=development', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
    expect(isDebugEnabledClient()).toBe(true);
  });

  it('returns true for NEXT_PUBLIC_APP_ENV=test', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'test');
    expect(isDebugEnabledClient()).toBe(true);
  });

  it('returns false for NEXT_PUBLIC_APP_ENV=production (production is blocked)', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    expect(isDebugEnabledClient()).toBe(false);
  });

  it('returns false for unknown NEXT_PUBLIC_APP_ENV values', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging');
    expect(isDebugEnabledClient()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_APP_ENV is not set', () => {
    // ensure the variable is absent
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', '');
    expect(isDebugEnabledClient()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDebugEnabled (backward-compatible alias → delegates to isDebugEnabledServer)
// ---------------------------------------------------------------------------
describe('isDebugEnabled (deprecated alias)', () => {
  it('returns true in development (via NODE_ENV)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isDebugEnabled()).toBe(true);
  });

  it('returns true in test (via NODE_ENV)', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(isDebugEnabled()).toBe(true);
  });

  it('returns false in production (production is blocked)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isDebugEnabled()).toBe(false);
  });

  it('returns false for unknown environments', () => {
    vi.stubEnv('NODE_ENV', 'staging');
    expect(isDebugEnabled()).toBe(false);
  });
});
