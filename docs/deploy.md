# Deploy — Watchdex ($0, smooth, easy data updates)

Three Cloudflare pieces, all on the free tier:

```
Worker (cron)  ── assemble() ──►  R2 bucket  ──► R2 custom domain (CDN)
   write side                       /v1/**            │  read, zero-function
                                                       ▼
SvelteKit SPA (Pages) ── fetch PUBLIC_DATA_BASE/v1/** ─┘
```

- **App runs smoothly**: reads are static JSON off R2+CDN (no function, SWR cache).
- **Zero cost**: Workers free (cron), R2 free (10GB/1M ops), Pages free.
- **Data updates easily**: cron rewrites `/v1/**` in R2; the SPA fetches fresh
  on the next pointer revalidation. No rebuild, no redeploy.

## 1. R2 bucket + public domain

```sh
cd worker
npx wrangler r2 bucket create watchdex-data
# Dashboard → R2 → watchdex-data → Settings → Custom Domain → data.watchdex.xyz
```

The SPA (watchdex.xyz) fetches data.watchdex.xyz → cross-origin, so set the
bucket CORS to allow the site origin (one-time):

```sh
npx wrangler r2 bucket cors put watchdex-data --rules '[
  { "AllowedOrigins": ["https://watchdex.xyz"], "AllowedMethods": ["GET","HEAD"], "MaxAgeSeconds": 86400 }
]'
```

## 2. Ingest worker (cron)

```sh
cd worker
npx wrangler secret put INGEST_SECRET   # protects the manual /ingest route
npx wrangler deploy                      # registers the cron (every 6h)
# seed immediately instead of waiting for cron:
curl -H "authorization: Bearer $INGEST_SECRET" https://watchdex-ingest.<acct>.workers.dev/ingest
```

`PAGES` (wrangler.toml [vars]) controls snapshot size (50 titles/page). Bump for
a fuller catalog → more related/recs resolve in R2.

## 3. SPA → Pages

```sh
cd web
PUBLIC_DATA_BASE=https://data.watchdex.xyz npm run build
npx wrangler pages deploy build --project-name watchdex
# or connect the repo in Pages with build env PUBLIC_DATA_BASE set
```

In dev `PUBLIC_DATA_BASE` is unset → the SPA reads same-origin `/v1` from
`web/static` (run `node ingest/build-data.mjs` once to populate it).

## Updating data

Nothing to redeploy — the cron handles it. To change the schema/shape, edit
`contract/discovery.ts` + `ingest/lib`, redeploy the worker; breaking changes go
to a new `/v2` namespace (see docs/r2-discovery.md), never mutate `/v1` in place.
