/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DebugButton from '@/components/debug/DebugButton';

// DebugPanel is lazy-loaded — stub it out so we don't need the real panel
vi.mock('@/components/debug/DebugPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="debug-panel">
      <button onClick={onClose}>close-panel</button>
    </div>
  ),
}));

describe('DebugButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toggle button', () => {
    render(<DebugButton />);
    expect(screen.getByRole('button', { name: /toggle debug console/i })).toBeInTheDocument();
  });

  it('does not show the panel on initial render', () => {
    render(<DebugButton />);
    expect(screen.queryByTestId('debug-panel')).not.toBeInTheDocument();
  });

  it('opens the panel when the button is clicked', async () => {
    render(<DebugButton />);
    fireEvent.click(screen.getByRole('button', { name: /toggle debug console/i }));
    await waitFor(() => {
      expect(screen.getByTestId('debug-panel')).toBeInTheDocument();
    });
  });

  it('closes the panel when the button is clicked a second time', async () => {
    render(<DebugButton />);
    const toggle = screen.getByRole('button', { name: /toggle debug console/i });

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByTestId('debug-panel')).toBeInTheDocument());

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByTestId('debug-panel')).not.toBeInTheDocument());
  });

  it('closes the panel when the panel triggers onClose', async () => {
    render(<DebugButton />);
    fireEvent.click(screen.getByRole('button', { name: /toggle debug console/i }));
    await waitFor(() => expect(screen.getByTestId('debug-panel')).toBeInTheDocument());

    fireEvent.click(screen.getByText('close-panel'));
    await waitFor(() => expect(screen.queryByTestId('debug-panel')).not.toBeInTheDocument());
  });

  it('button has the correct accessible label', () => {
    render(<DebugButton />);
    const btn = screen.getByRole('button', { name: /toggle debug console/i });
    expect(btn).toHaveAttribute('aria-label', 'Toggle debug console');
  });

  it('button is positioned as a fixed element', () => {
    render(<DebugButton />);
    const btn = screen.getByRole('button', { name: /toggle debug console/i });
    // Fixed position comes from the Tailwind class 'fixed'
    expect(btn.className).toMatch(/fixed/);
  });
});
