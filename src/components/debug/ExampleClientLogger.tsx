'use client';

/**
 * ExampleClientLogger
 *
 * Demonstrates how to use `clientLogger` inside a Client Component.
 * This component is intentionally simple — it is a usage example, not a
 * production UI element.
 *
 * Include it in any page while debugging:
 * ```tsx
 * import ExampleClientLogger from '@/components/debug/ExampleClientLogger';
 * // …
 * <ExampleClientLogger />
 * ```
 */

import { clientLogger } from '@/lib/debug/client-logger';

export default function ExampleClientLogger() {
  const handleDebug = () => {
    void clientLogger.debug('Debug button clicked', { component: 'ExampleClientLogger' });
  };

  const handleInfo = () => {
    void clientLogger.info('Info button clicked', { component: 'ExampleClientLogger' });
  };

  const handleWarn = () => {
    void clientLogger.warn('Warn button clicked', { component: 'ExampleClientLogger' });
  };

  const handleError = () => {
    void clientLogger.error('Error button clicked', { component: 'ExampleClientLogger' });
  };

  return (
    <div className="flex flex-wrap gap-2 p-4">
      <button
        onClick={handleDebug}
        className="px-3 py-1 text-xs bg-purple-900 hover:bg-purple-800 text-purple-200 rounded transition"
      >
        Log debug
      </button>
      <button
        onClick={handleInfo}
        className="px-3 py-1 text-xs bg-blue-900 hover:bg-blue-800 text-blue-200 rounded transition"
      >
        Log info
      </button>
      <button
        onClick={handleWarn}
        className="px-3 py-1 text-xs bg-yellow-900 hover:bg-yellow-800 text-yellow-200 rounded transition"
      >
        Log warn
      </button>
      <button
        onClick={handleError}
        className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-200 rounded transition"
      >
        Log error
      </button>
    </div>
  );
}
