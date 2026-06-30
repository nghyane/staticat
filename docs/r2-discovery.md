# R2 layout — Watchdex discovery

Canonical contract: `contract/discovery.ts`. This doc explains the key layout,
cache, versioning and how to extend. Locked design — read before changing.

## Principle

```
Write  ⟂ Read     ingest (cron → R2)        ⟂  SPA (client → R2 via CDN)
Pointer ⟂ Immutable   manifest/index/home (mutable, short cache)  ⟂  catalog shards (hashed, 1y)
Core   ⟂ Per-kind   Card/Entity shared      ⟂  details discriminated by kind
```

The frontend reads ONLY this contract. No third-party API on the read path: if
a source dies, the last published snapshot keeps serving.

## Key layout

```
r2://watchdex/                          one bucket · CDN custom domain
└── v1/                                 SCHEMA version. Breaking change → /v2 (runs alongside)
    ├── manifest.json                   { schema, buildAt, verticals[] }
    └── {kind}/                         kind ∈ anime | movie | game   ← add vertical = add dir
        ├── index.json                  pointer: counts, dataVersion, facets[], updatedAt
        ├── home.json                   home payload: featured + airing[] + trending[] (LITE cards)
        ├── entity/{id}.json            RICH, one file per title, key = STABLE id   ← detail page
        ├── catalog/{shard}-{hash}.json LITE cards, ~500/shard, content-hashed   [reserved]
        ├── facet/{dim}/{value}.json    precomputed id-lists: genre / year-season / status / studio  [reserved]
        ├── search.json                 lite index: id, slug, title, synonyms   [reserved]
        └── sitemap.xml                 for SSR/SEO   [reserved]
```

Implemented now: `manifest`, `{kind}/index`, `{kind}/home`, `{kind}/entity`.
Reserved (namespace held, added later WITHOUT breaking home/entity): catalog,
facet, search, sitemap.

## Contract shape

- **Card** (lite) — home/catalog/search/facets. Carries facet fields (status,
  genres, year, score) so the client filters in place. `meta` is a precomputed
  lead line; `next:{label,at}` is the unified "when" (anime EP / movie premiere
  / game launch) so Hero/ScheduleRow/Countdown are shared across verticals.
- **Ref** (minimal) — recs/relations thumbnails. id, slug, title, cover, meta.
- **Entity** (rich) — `extends Card` + description, banner, tags, `details`
  (discriminated by kind), streams, related, recommendations, characters.

## URL / id

- URL: `/{kind}/{name}-{id}` (e.g. `/anime/liar-game-197754`).
- Entity fetched by `idFromSlug(slug)` → `/v1/{kind}/entity/{id}.json`.
  - Renaming (romanization) does not break the link (id is the slug tail).
  - Cold deep-link works without loading the catalog first.
- id is per-kind (the path already separates kinds → no global namespacing).

## Cache / versioning

| Object | Cache-Control |
|---|---|
| manifest, index, home (pointers) | `max-age=120, stale-while-revalidate=1d` |
| entity/{id} | `max-age=300, swr=1d` |
| catalog/{shard}-{hash} (immutable) | `max-age=1y, immutable` |

- `/v1/` = schema version. Breaking schema change → write `/v2/` alongside;
  `/v1` clients keep working; migrate the SPA, then retire `/v1`.
- `index.json.dataVersion` = content build id → bust shards without CDN purge.

## Extending

- **New field (non-breaking)**: add optional to Entity/Card, fill in ingest.
  Old clients ignore it. No version bump.
- **New vertical**: add `Kind`, a `XxxDetails` branch, and write `/v1/{kind}/*`.
  Core + components untouched (they key on Card/`next`/`status`).
- **Scale (catalog grows)**: start writing `catalog/` shards + `facet/` lists +
  `search.json`; point `index.json` at them. home/entity unchanged.
- **Breaking change**: new `/v2` namespace, never mutate `/v1` in place.
