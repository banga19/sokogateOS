# Integration Design Specification – Third‑Party Services

**Date:** 2026‑08‑01

## Overview
This design adds thin, typed wrappers for Neon, Clerk, Stripe, Sentry, Cloudflare R2, PostHog, Upstash, Pinecone, and Coderabbit. Wrappers live under `src/lib/` and read configuration from a central `src/env.ts` interface.

## Environment
Create `config/env.example` with placeholders for:
```
NEON_DATABASE_URL=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
POSTHOG_API_KEY=
POSTHOG_HOST=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
CODERABBIT_API_KEY=
```
Add `src/env.ts` exporting a typed `Env` interface that maps `process.env` keys.

## Wrapper Modules (src/lib/)
| Service | Export | Usage comment |
|--------|--------|---------------|
| Neon | `neonPool` – `Pool` from `@neondatabase/client` | `// const pool = neonPool;` |
| Clerk | `initClerk()` + `ClerkProvider` React component | `// <ClerkProvider>` |
| Stripe | `stripeClient` + `createCheckoutSession` helper | `// stripeClient.checkout.sessions.create(...)` |
| Sentry | `initSentry()` and exported `Sentry` object | `// Sentry.captureException(err)` |
| R2 | `r2Client` – bucket helper from `@cloudflare/r2-sdk` | `// r2Client.put('path', data)` |
| PostHog | `track(event, props)` function | `// track('button_click', {name})` |
| Upstash | `upstashRedis` – client from `@upstash/redis` | `// await upstashRedis.set('key', 'value')` |
| Pinecone | `pineconeClient` – initialized client | `// pineconeClient.query(...)` |
| Coderabbit | `CoderabbitWidget` React component | `// <CoderabbitWidget />` |

All wrappers throw `Error('Missing <VAR> env var')` if required variables are undefined.

## Testing Strategy
For each wrapper a Jest test under `__tests__/` will:
1. Mock the external SDK.
2. Verify that missing env vars cause a clear error.
3. Include a simple integration test (Neon query) guarded by `if (process.env.NEON_DATABASE_URL)`.

## Verification
A `scripts/verify.sh` script will run `npm run build`, `npm test`, and a secret‑leak scan (`grep -R "SECRET\|KEY\|TOKEN" .`). Non‑zero exit on failure.

## Commit
All changes will be committed with a message:
```
feat: integrate core third‑party services (Neon, Clerk, Stripe, Sentry, Cloudflare R2, PostHog, Upstash, Pinecone, Coderabbit)

- Added SDK dependencies (manual install step)
- Scaffolded env vars and TypeScript types
- Implemented thin wrapper libraries under src/lib
- Added unit tests and CI verification

No secret values are present in the repo.
```