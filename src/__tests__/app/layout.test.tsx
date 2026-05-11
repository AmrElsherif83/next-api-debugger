/**
 * @vitest-environment jsdom
 *
 * Tests for RootLayout — focused on the production gating of the
 * floating debug button (the primary runtime behaviour introduced here).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// next/font/local returns an object with a `variable` CSS-custom-property string.
vi.mock('next/font/local', () => ({
  default: () => ({ variable: '--font-mock', className: 'font-mock' }),
}));

// DebugButton is a Client Component — stub it so we can assert on presence.
vi.mock('@/components/debug/DebugButton', () => ({
  default: () => <div data-testid="debug-button">DebugButton</div>,
}));

vi.mock('@/lib/debug/env', () => ({
  isDebugEnabled: vi.fn(() => true),
}));

import { isDebugEnabled } from '@/lib/debug/env';
import RootLayout from '@/app/layout';

const mockIsDebugEnabled = isDebugEnabled as ReturnType<typeof vi.fn>;

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('RootLayout — debug button gating', () => {
  beforeEach(() => {
    mockIsDebugEnabled.mockReturnValue(true);
  });

  it('renders children inside the body', () => {
    render(
      <RootLayout>
        <main data-testid="child-content">hello</main>
      </RootLayout>,
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders DebugButton when isDebugEnabled() returns true', () => {
    mockIsDebugEnabled.mockReturnValue(true);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(screen.getByTestId('debug-button')).toBeInTheDocument();
  });

  it('does NOT render DebugButton when isDebugEnabled() returns false (production gated)', () => {
    mockIsDebugEnabled.mockReturnValue(false);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(screen.queryByTestId('debug-button')).not.toBeInTheDocument();
  });

  it('isDebugEnabled is called exactly once per render', () => {
    mockIsDebugEnabled.mockReturnValue(true);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(mockIsDebugEnabled).toHaveBeenCalledOnce();
  });
});
