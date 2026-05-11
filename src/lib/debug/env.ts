/**
 * Environment helper for the Next.js App Router debug console feature.
 *
 * Two separate helpers are provided so that server-side code and
 * client-side (browser) code each read only the env variables that
 * are available to them at runtime:
 *
 *  - isDebugEnabledServer()  – safe to call in Server Components, Route
 *    Handlers, and middleware.  Reads APP_ENV first and falls back to
 *    NODE_ENV.  Neither variable is exposed to the browser bundle.
 *
 *  - isDebugEnabledClient()  – safe to call in Client Components and
 *    any browser-executed code.  Reads NEXT_PUBLIC_APP_ENV, which Next.js
 *    inlines into the client bundle at build time.
 *
 * Both helpers return `true` only for "local", "development", and "test"
 * environments and always return `false` for "production".
 *
 * ⚠ Production-exposure notes
 * ----------------------------
 * 1. Never add APP_ENV=development (or any non-production value) to your
 *    production deployment — that would re-enable debug features.
 * 2. Never rename an env var to NEXT_PUBLIC_* in production if it controls
 *    a security gate, because the value will be embedded in the JS bundle.
 * 3. In CI/CD pipelines, ensure that production builds always set
 *    NODE_ENV=production (Next.js does this automatically for `next build`).
 *
 * Example usage (server):
 * ```ts
 * import { isDebugEnabledServer } from '@/lib/debug/env';
 *
 * export async function GET() {
 *   if (!isDebugEnabledServer()) {
 *     return new Response('Not Found', { status: 404 });
 *   }
 *   // ... return debug data
 * }
 * ```
 *
 * Example usage (client):
 * ```tsx
 * 'use client';
 * import { isDebugEnabledClient } from '@/lib/debug/env';
 *
 * export function DebugPanel() {
 *   if (!isDebugEnabledClient()) return null;
 *   return <div>Debug info …</div>;
 * }
 * ```
 */

/** Environments in which the debug console is active. */
const DEBUG_ENVS = new Set(['local', 'development', 'test']);

/**
 * Server-safe check.  Reads `APP_ENV` first; falls back to `NODE_ENV`.
 * Call this in Server Components, Route Handlers, and middleware only —
 * these variables are never sent to the browser.
 */
export function isDebugEnabledServer(): boolean {
  const env = process.env.APP_ENV ?? process.env.NODE_ENV;
  return DEBUG_ENVS.has(env ?? '');
}

/**
 * Client-safe check.  Reads `NEXT_PUBLIC_APP_ENV`, which Next.js inlines
 * into the browser bundle at build time.
 * Call this in Client Components and any code that runs in the browser.
 */
export function isDebugEnabledClient(): boolean {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  return DEBUG_ENVS.has(env ?? '');
}

/**
 * @deprecated Prefer `isDebugEnabledServer` for server-side code.
 * Kept for backward compatibility.
 */
export function isDebugEnabled(): boolean {
  return isDebugEnabledServer();
}
