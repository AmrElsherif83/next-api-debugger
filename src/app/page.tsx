import { apiFetch } from "@/lib/debug/api-fetch";
import { logger } from "@/lib/debug/logger";

/**
 * Demo Server Component.
 *
 * All data-fetching stays on the server; only the floating button and
 * debug panel are Client Components.  In production every debug call
 * is compiled away by the isDebugEnabled() guard.
 */
export default async function HomePage() {
  // ── 1. Plain logger usage ────────────────────────────────────────────────
  logger.info("HomePage rendered", { route: "/" });
  logger.debug("Environment check", { nodeEnv: process.env.NODE_ENV });

  // ── 2. Successful API call (public JSON placeholder) ────────────────────
  let post: Record<string, unknown> | null = null;
  try {
    const res = await apiFetch("https://jsonplaceholder.typicode.com/posts/1", {
      logCategory: "request",
    });
    post = (await res.json()) as Record<string, unknown>;
    logger.info("Fetched post successfully", { postId: post.id }, "response");
  } catch {
    logger.error("Failed to fetch post", {}, "exception");
  }

  // ── 3. Call that returns a non-2xx status ────────────────────────────────
  try {
    await apiFetch("https://jsonplaceholder.typicode.com/posts/9999", {
      logCategory: "request",
    });
  } catch {
    // intentionally swallowed for demo purposes
  }

  // ── 4. Call with a sensitive header (will be masked in the log) ──────────
  try {
    await apiFetch("https://jsonplaceholder.typicode.com/users/1", {
      headers: {
        Authorization: "Bearer super-secret-token",
        "X-Api-Key": "my-api-key-12345",
        "Content-Type": "application/json",
      },
      logCategory: "request",
    });
  } catch {
    // intentionally swallowed
  }

  logger.warn("Demo page finished loading — open the debug console (🛠) to inspect logs");

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 px-6">
      <main className="w-full max-w-2xl space-y-8 py-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Next API Debugger
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            A local/test-only developer debug console for Next.js Server Components.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Sample API response
          </h2>
          {post ? (
            <pre className="text-sm text-zinc-600 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(post, null, 2)}
            </pre>
          ) : (
            <p className="text-red-500 text-sm">Failed to load post.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            How to use the debug console
          </h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Run the app in development mode (<code>npm run dev</code>).</li>
            <li>
              Click the <strong>🛠</strong> button in the bottom-right corner.
            </li>
            <li>
              Inspect server-side logs and API calls — including masked cURL commands you can
              copy and replay in your terminal.
            </li>
            <li>The button is hidden automatically in production.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
