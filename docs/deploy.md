# Deploy — Watchdex (live, keyless, auto-update)

Three Cloudflare pieces, **no API keys anywhere**, all free tier:

```
Worker (cron 2h) ── Jikan (MAL, no key, not CF-blocked) ──► R2 (binding, no S3 key)
   write side          fast list + bounded enrich              /v1/**
                                                                  │ r2.dev + CORS
SvelteKit SPA (Pages, shell-only) ── fetch PUBLIC_DATA_BASE/v1/** ┘  read, zero-function
```

- **Complete page**: schedule + countdown, characters/cast, related, recs,
  where-to-watch (streaming) — all from Jikan.
- **Keyless**: worker writes R2 via *binding* (no S3 key); Jikan needs no key
  and isn't CF-blocked (unlike AniList). wrangler uses OAuth.
- **Auto-update**: cron rewrites only changed files in R2; the SPA reads R2
  directly — no rebuild, no redeploy.

## 1. R2 bucket + public read + CORS

```sh
npx wrangler r2 bucket create watchdex-data
npx wrangler r2 bucket dev-url enable watchdex-data        # → https://pub-XXXX.r2.dev
printf '{"rules":[{"allowed":{"origins":["*"],"methods":["GET","HEAD"],"headers":["*"]},"maxAgeSeconds":86400}]}' > cors.json
npx wrangler r2 bucket cors set watchdex-data --file cors.json --force
```

## 2. Ingest worker (cron)

```sh
cd worker && npx wrangler deploy        # binding + cron 2h, no secrets
curl https://watchdex-ingest.<acct>.workers.dev/ingest   # seed now (repeat a few
                                                          # times to finish enrich)
```

`AIRING_PAGES`/`POPULAR_PAGES`/`ENRICH_LIMIT` (wrangler.toml [vars]) tune
breadth + per-run enrichment budget. Enrichment is progressive: each run keeps
schedule fresh + enriches the next slice, so it fits Worker limits.

## 3. SPA → Pages (shell-only, reads R2)

```sh
cd web && rm -rf static/v1                     # no co-host; data lives in R2
PUBLIC_DATA_BASE=https://pub-XXXX.r2.dev npm run build
npx wrangler pages deploy build --project-name watchdex --branch main
```

Dev: leave `PUBLIC_DATA_BASE` unset and run `node ingest/build-data.mjs` once →
same-origin `/v1` from `web/static`.

## Swapping source

Identity is MAL-canonical (`anime:{mal_id}`), so the crawl source is pluggable
— only `ingest/lib/*.js` (the map → EntityMeta) changes. `jikan.js` (no key) is
the default; `anilist.js` (better schedule, but CF-blocked → needs a non-CF
relay, `ingest/relay.ts`) is the alternative. Contract/R2/FE never change.
