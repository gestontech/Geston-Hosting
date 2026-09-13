# Contributing to Geston Host

## Getting started

```bash
cp .env.example .env
yarn install
yarn dev          # frontend (Vite)
yarn dev:server   # backend (Express)
```

Run `yarn test` and `yarn lint` before opening a PR. `yarn build` should also
succeed cleanly (`tsc -b && vite build && tsc -p tsconfig.server.json`).

## Code style

- **No comments in source files.** This codebase deliberately keeps logic
  self-explanatory through naming and structure rather than comments. Match
  this convention in new code — if something needs a comment to be
  understood, that's usually a sign it should be a named helper function
  instead.
- **Errors go through `next(err)`.** Every route handler wraps its body in
  `try { ... } catch (err) { next(err); }` and lets the shared `errorHandler`
  middleware (`server/lib/errors.ts`) turn it into a structured response.
  Don't reach for `res.status(500).json(...)` directly in a generic catch —
  the only exception is a catch block that needs to return a *specific*,
  meaningful client-facing message (see `payments/kenya.ts`'s charge routes
  for an example of when that's appropriate).
- **No secrets read inline with a fallback.** `process.env.SOME_SECRET || ""`
  scattered across files is exactly the pattern this codebase moved away
  from. If a value needs validating or reusing across files, add it to
  `server/lib/env.ts` (or the relevant local `shared.ts`) once and import it.

## File size and structure

Route and service files are kept under roughly 300 lines. When a file grows
past that, split it by resource/responsibility into a subfolder rather than
letting it keep growing — see `server/routes/admin/`, `server/routes/payments/`,
`server/routes/auth/`, `server/routes/bots/`, `server/routes/boost/`, and
`server/services/bot/` for the pattern: a thin top-level file (e.g. `admin.ts`)
that only creates the router/composer and mounts sub-routers, with the actual
route logic living in the subfolder.

Two things to watch for when splitting a file like this:

1. **Shared mutable state** (in-memory `Map`s, caches) must be declared in
   exactly one file and imported everywhere else that needs it — never
   re-created with `new Map()` in more than one place. See
   `server/routes/auth/shared.ts` (magic-link/reset tokens) for the pattern.
2. **Middleware ordering can be load-bearing.** Some routes are
   intentionally public and only become protected because a guard is
   `router.use()`'d *after* them (see `server/routes/bots.ts`'s
   `/trial-check/:phone` route). If you're moving code between files,
   preserve the relative order things get registered in, not just which file
   they live in.

## Tests

Tests live in `__tests__` folders next to the code they cover
(`server/routes/admin/__tests__/`, `server/routes/payments/__tests__/`, etc.),
using Vitest + Supertest. The general pattern in this codebase:

- Mock models, middleware, and services with `vi.mock`, keyed by the models'
  actual import path relative to the test file (not the file under test) —
  since mocks are resolved by the physical module path, not the string you
  wrote when calling `vi.mock`.
- Mount the router under test on a bare `express()` app with
  `express.json()` and the shared `errorHandler` middleware, then hit it with
  `supertest`.
- When a module reads `process.env` at import time (e.g. `ADMIN_EMAIL` in
  `server/routes/admin/shared.ts`), use `vi.stubEnv(...)` followed by a
  dynamic `await import(...)` inside `beforeAll`, rather than a static
  top-of-file import — static imports resolve before your test file's own
  `vi.stubEnv` call has a chance to run.

New routes or non-trivial logic changes should come with at least one test
covering the success path and one covering a realistic failure path (bad
input, not-found, insufficient balance, etc.) — see any file in
`server/routes/*/__tests__/` for the expected shape.

## Commit messages

Use conventional-commit-style prefixes (`refactor(scope): ...`,
`fix(scope): ...`, `test(scope): ...`, `docs(scope): ...`) with a short body
explaining *why*, not just *what*, when the change isn't self-evident from
the diff.
