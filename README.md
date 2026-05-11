# next-api-debugger

A developer debugging toolkit for **Next.js App Router** (Server Components).  
View server-side logs, inspect API requests/responses, and copy cURL commands — all inside the browser, only in local and test environments.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Installation](#4-installation)
5. [Environment Setup](#5-environment-setup)
6. [Running Tests](#6-running-tests)
7. [How to Use in Another Next.js Project](#7-how-to-use-in-another-nextjs-project)
8. [Usage Examples](#8-usage-examples)

---

## 1. Project Overview

### The problem with Server Components

Next.js App Router moves data-fetching into **Server Components** — code that runs exclusively on the Node.js server and is never sent to the browser.  
This is great for performance and security, but it makes debugging painful:

- `console.log` output appears only in the **terminal**, not the browser.
- You cannot use browser DevTools network tab to inspect API calls made from the server.
- There is no built-in way to reproduce a server-side request as a `curl` command.

### How this toolkit helps

`next-api-debugger` captures everything that happens on the server and **surfaces it inside the browser** via a floating debug console.  
You replace the native `fetch` with `apiFetch` and swap `console.log` for structured `logger` calls.  
A lightweight in-memory store on the server collects the entries; a polling client-side panel reads them from a local API route and displays them in a dark, scrollable overlay.

The entire debug path — the API routes, the floating panel, the log store — is **completely inert in production**.  
A single environment variable (`APP_ENV`) is the only switch you need.

---

## 2. Features

| Feature | Description |
|---|---|
| **Structured server logging** | `logger.debug/info/warn/error` write to the in-memory store with level, category, source, and optional metadata. |
| **Client-side logging** | `clientLogger` mirrors the server API and posts entries to `/api/debug/logs` from Client Components. |
| **API request logging** | `apiFetch` wraps `fetch` and records method, URL, status code, and duration automatically. |
| **cURL generation** | Every `apiFetch` call produces a copy-paste–ready `curl` command displayed in the panel. |
| **Request timing** | Round-trip duration in milliseconds is captured for every request. |
| **Header masking** | `Authorization`, `Cookie`, `x-api-key`, and other sensitive headers are replaced with `[REDACTED]` before they reach the browser. |
| **Body previews** | Optionally capture truncated request and response body snapshots for quick inspection. |
| **Floating debug console** | A `🛠` button in the bottom-right corner opens a dark overlay with filterable, colour-coded log entries. |
| **Level filtering** | Filter entries by `debug`, `info`, `warn`, or `error` with a single click. |
| **Auto-polling** | The panel refreshes every 5 seconds so new server entries appear without a manual reload. |
| **Local/test only** | The debug UI and all API routes return `403` in production. No debug code is ever shipped to end users. |
| **HMR-stable store** | In development, the log store survives Next.js Hot Module Replacement cycles. |

---

## 3. Architecture

```
src/
├── lib/debug/
│   ├── env.ts            — environment helpers (isDebugEnabledServer / isDebugEnabledClient)
│   ├── logger.ts         — server-side structured logger
│   ├── client-logger.ts  — client-side logger (posts to /api/debug/logs)
│   ├── api-fetch.ts      — fetch wrapper that records request/response details
│   ├── curl-generator.ts — builds masked cURL strings from fetch arguments
│   └── log-store.ts      — in-memory singleton that stores LogEntry objects
│
├── app/api/debug/logs/
│   └── route.ts          — GET / POST / DELETE route handler for log entries
│
├── components/debug/
│   ├── DebugButton.tsx   — floating 🛠 toggle button (lazy-loads DebugPanel)
│   └── DebugPanel.tsx    — scrollable dark overlay with filtering and cURL copy
│
└── types/
    └── debug.ts          — shared TypeScript types (LogEntry, ApiCallLog, …)
```

### Module responsibilities

**`env.ts`** — Single source of truth for the debug gate.  
`isDebugEnabledServer()` reads `APP_ENV` (falls back to `NODE_ENV`) and returns `true` only for `local`, `development`, and `test`.  
`isDebugEnabledClient()` reads `NEXT_PUBLIC_APP_ENV`, which Next.js inlines into the browser bundle at build time.

**`logger.ts`** — Server-side structured logger.  
Each method (`debug`, `info`, `warn`, `error`) creates a `LogEntry` with a UUID, ISO timestamp, level, source, category, message, and optional metadata, then appends it to the log store. It is a no-op when `isDebugEnabledServer()` returns `false`.

**`client-logger.ts`** — Mirrors the `logger` API for Client Components.  
Instead of writing directly to the store (which is only accessible on the server), it `POST`s the entry to `/api/debug/logs`. Network failures are silently swallowed so a failing debug request never breaks the application.

**`api-fetch.ts`** — Drop-in replacement for `fetch`.  
Records method, URL, masked headers, status code, duration, and a generated cURL string. Supports optional body and response previews. Falls back to the plain `fetch` in production.

**`curl-generator.ts`** — Produces a valid, shell-safe `curl` command from a fetch descriptor. All sensitive header values are masked before serialisation. Single quotes inside any field are escaped with the ANSI-C quoting trick.

**`log-store.ts`** — Module-level singleton (capped at 500 entries). In development, the array is pinned on `globalThis` to survive HMR re-evaluations. Exposes `addEntry`, `getEntries`, and `clearEntries`.

**`route.ts`** — REST handler for the log store. `GET` returns all entries; `POST` accepts a validated client log payload and stores it with `source` forced to `'client'`; `DELETE` clears the store. All three methods return `403` when `isDebugEnabledServer()` returns `false`.

**`DebugButton.tsx` / `DebugPanel.tsx`** — Floating UI components. The button lives in the root layout and is only rendered when `isDebugEnabledServer()` is `true`. The panel is lazy-loaded (zero overhead when closed) and polls `/api/debug/logs` every 5 seconds.

---

## 4. Installation

```bash
git clone https://github.com/AmrElsherif83/next-api-debugger.git
cd next-api-debugger
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see a `🛠` button in the bottom-right corner.

---

## 5. Environment Setup

Create a `.env.local` file in the project root:

```dotenv
APP_ENV=local
NEXT_PUBLIC_APP_ENV=local
```

### Behaviour by environment

| `APP_ENV` value | Debug enabled? | Notes |
|---|---|---|
| `local` | ✅ Yes | Recommended for day-to-day development |
| `development` | ✅ Yes | Matches the Next.js default `NODE_ENV` in `next dev` |
| `test` | ✅ Yes | Used in automated test runs |
| `production` | ❌ No | All debug routes return `403`; the UI is not rendered |
| *(unset)* | Depends on `NODE_ENV` | Inherits Next.js defaults (`development` in `next dev`, `production` in `next build`) |

> **Security note:** `NEXT_PUBLIC_APP_ENV` is embedded in the browser bundle at build time.  
> Never set it to a non-production value in a production deployment.

---

## 6. Running Tests

```bash
npm run verify
```

`verify` is a one-command quality gate that runs four checks in sequence:

```
npm run lint       — ESLint (Next.js recommended rules)
npm run typecheck  — TypeScript compiler check (no emit)
npm run test       — Vitest unit and component tests
npm run build      — Next.js production build
```

All four must pass before a change is considered ready.

To run individual checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 7. How to Use in Another Next.js Project

### Option A — Copy source files

This is the recommended approach today. Copy the relevant source directories into your project.

#### Step 1 — Copy the core library

```
your-app/
└── src/
    └── lib/
        └── debug/        ← copy from next-api-debugger/src/lib/debug/
```

Files to copy:

- `env.ts`
- `logger.ts`
- `client-logger.ts`
- `api-fetch.ts`
- `curl-generator.ts`
- `log-store.ts`

#### Step 2 — Copy the API route

```
your-app/
└── src/
    └── app/
        └── api/
            └── debug/
                └── logs/
                    └── route.ts   ← copy from next-api-debugger/src/app/api/debug/logs/route.ts
```

This route handler exposes `GET`, `POST`, and `DELETE` on `/api/debug/logs`.

#### Step 3 — Copy the debug UI components

```
your-app/
└── src/
    └── components/
        └── debug/
            ├── DebugButton.tsx   ← copy from next-api-debugger/src/components/debug/
            └── DebugPanel.tsx
```

#### Step 4 — Copy the shared types

```
your-app/
└── src/
    └── types/
        └── debug.ts   ← copy from next-api-debugger/src/types/debug.ts
```

#### Step 5 — Add environment variables

Add to your `.env.local`:

```dotenv
APP_ENV=local
NEXT_PUBLIC_APP_ENV=local
```

#### Step 6 — Mount the debug button in your root layout

```tsx
// src/app/layout.tsx
import { isDebugEnabledServer } from '@/lib/debug/env';
import DebugButton from '@/components/debug/DebugButton';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const debugEnabled = isDebugEnabledServer();

  return (
    <html lang="en">
      <body>
        {children}
        {debugEnabled && <DebugButton />}
      </body>
    </html>
  );
}
```

The `DebugButton` is conditionally rendered on the **server**, so it produces zero HTML in production — no dead code, no runtime cost.

---

### Option B — Import as a shared package (future)

> **Note:** Package publishing is planned for a future release. The API below shows the intended usage once `next-api-debugger` is available on npm.

```bash
npm install next-api-debugger
```

```ts
import { logger, apiFetch } from 'next-api-debugger';
import { clientLogger } from 'next-api-debugger/client';
```

---

## 8. Usage Examples

### Example 1 — Structured logging in a Server Component

```ts
// src/app/users/page.tsx  (Server Component)
import { logger } from '@/lib/debug/logger';

export default async function UsersPage() {
  logger.info('Loading users');

  const res = await fetch('/api/users');
  const users = await res.json();

  logger.debug('Users loaded', { count: users.length });

  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### Example 2 — Instrumented server fetch with `apiFetch`

```ts
// src/app/dashboard/page.tsx  (Server Component)
import { apiFetch } from '@/lib/debug/api-fetch';

export default async function DashboardPage() {
  const res = await apiFetch('https://api.example.com/dashboard', {
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
  }, {
    label: 'loadDashboard',
    responsePreviewLimit: 500,
  });

  const data = await res.json();
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

The debug panel will show:

- `[loadDashboard] GET https://api.example.com/dashboard — 200`
- Method, status code, and duration
- A copy-paste cURL command with `Authorization: [REDACTED]`
- A 500-character preview of the response body

### Example 3 — Client-side logging in a Client Component

```tsx
// src/components/SubmitButton.tsx
'use client';

import { clientLogger } from '@/lib/debug/client-logger';

export function SubmitButton() {
  const handleClick = async () => {
    await clientLogger.info('Submit clicked', { buttonId: 'submit' });
    // ... form submission logic
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

Client log entries appear in the debug panel tagged with `[client]` so you can distinguish them from server entries.

### Example 4 — Adding the debug console to a layout

```tsx
// src/app/layout.tsx
import { isDebugEnabledServer } from '@/lib/debug/env';
import DebugButton from '@/components/debug/DebugButton';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const debugEnabled = isDebugEnabledServer();

  return (
    <html lang="en">
      <body>
        {children}
        {/* Floating 🛠 button — only rendered in local/development/test */}
        {debugEnabled && <DebugButton />}
      </body>
    </html>
  );
}
```

Click the `🛠` button in the bottom-right corner to open the debug panel.  
Use the level filter buttons (`debug`, `info`, `warn`, `error`) to narrow the list.  
Click **Copy** next to any cURL block to copy it to the clipboard.  
Click **Clear** to flush all entries from the in-memory store.
