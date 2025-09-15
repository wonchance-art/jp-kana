This repository is a small Next.js (App Router) TypeScript app for practicing Japanese kana/kanji.

Quick orientation
- App entry: `src/app` uses the Next.js App Router (server components by default). Pages that call browser APIs or use React state have `'use client'` at the top (e.g. `src/app/me/page.tsx`).
- Styling: Tailwind CSS (see `postcss.config.mjs` / `tailwindcss` in devDependencies).
- Auth & DB: Supabase is used. There are two helpers:
  - `src/lib/supabase.ts` — client-side Supabase client (used inside components/pages with `'use client'`).
  - `src/lib/supabaseServer.ts` — Admin/service-role Supabase client for server-side API routes (`src/app/api/*`).

Important patterns & conventions for edits
- Separation of client vs server logic: prefer using `supabaseAdmin` (server) inside API route handlers (e.g. `src/app/api/dict/route.ts`) for secrets and DB writes; use `supabase` (client) inside pages/components for user-scoped actions and session handling.
- Data shape: main tables used in code:
  - `words` (fields referenced: `id, kanji, kana, readings, meaning, pos, audio_url, source, last_fetched`)
  - `examples` (linked by `word_id`)
  - `attempts` (used by `src/app/me/page.tsx`: `id, word_id, input, correct, created_at`, joined with `words`)
- API route behavior: `src/app/api/dict/route.ts` caches fetched Jisho results in `words` and `examples`. When modifying it, preserve the upsert + 24-hour freshness check logic.
- Kana normalization: utility `src/lib/kana.ts` expects to normalize katakana -> hiragana and strip whitespace. Reuse this util when dealing with input matching.

Developer workflows & scripts
- Start dev server: `npm run dev` (uses `next dev --turbopack`).
- Build: `npm run build`; Start production server: `npm run start`.
- Lint: `npm run lint` (ESLint configured via `eslint-config-next`).

Testing & verification notes (what to run locally)
- Run dev server and hit pages that use Supabase. For server APIs that use `supabaseAdmin`, ensure env vars are present in your environment (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client).
- Typical quick checks after edits:
  - Type-check / compile by running `npm run dev` or `npm run build`.
  - Smoke test the dictionary endpoint: `/api/dict?q=語` to verify Jisho upsert flow.

Patterns to follow when changing UI
- Keep server components where possible (no `'use client'`) unless you need state, effect, refs, or browser APIs.
- Small presentational components live in `src/components` (e.g. `NavBar.tsx`, `Toast.tsx`). Follow existing accessibility patterns (focus handling in `NavBar`).

When touching database code
- Prefer `supabaseAdmin` inside `src/app/api/*` routes. Preserve `.maybeSingle()`, `.limit()`, and `.range()` usage where present (they affect results & types).
- Keep the `last_fetched` 24-hour freshness gate in `api/dict/route.ts` to avoid excessive external API calls.

Files worth reading before making changes
- `src/app/me/page.tsx` — complex client-side logic: paging, server-side filters vs client-side search, CSV export, and statistics aggregation (recent 500 attempts).
- `src/app/api/dict/route.ts` — external API integration + upsert behavior.
- `src/lib/supabase.ts` and `src/lib/supabaseServer.ts` — client vs server Supabase usage.
- `src/lib/kana.ts` — normalization helper used across UI & matching logic.

If something is unclear
- Ask which environment variables are available and whether you should add migrations or alter DB fields. The code assumes certain columns exist; any DB schema change requires coordination.

Please review and tell me if you'd like these instructions expanded (examples for common edits, preferred commit message format, or automated checks to add).
