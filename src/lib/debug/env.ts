/**
 * Returns true only in development and test environments.
 * All debug features are gated behind this check so they are
 * completely inactive in production.
 */
export function isDebugEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}
