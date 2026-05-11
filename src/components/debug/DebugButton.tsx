'use client';

import { useState, lazy, Suspense } from 'react';

const DebugPanel = lazy(() => import('./DebugPanel'));

/**
 * Floating debug button rendered in the bottom-right corner.
 * The panel is lazy-loaded so it adds zero overhead when closed.
 * This component is only mounted in the layout when isDebugEnabled() is true.
 */
export default function DebugButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle debug console"
        title="Debug Console"
        className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 border border-gray-600 text-white shadow-lg hover:bg-gray-700 transition text-lg"
      >
        🛠
      </button>

      {open && (
        <Suspense fallback={null}>
          <DebugPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
