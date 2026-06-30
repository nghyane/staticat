# R2 layout — Watchdex discovery

> Bám `spec/contract.yaml` (base) + `docs/variant-discovery.md` (variant).
> Lệch → `spec/contract.yaml` thắng. Contract code: `contract/discovery.ts`.

Discovery KHÔNG host content (chương/tập) — chỉ catalog metadata + value-add
(where-to-watch / schedule). Tái dùng **đúng** pattern base: `head.json` pointer
+ `meta.v{rev}.json` immutable + `CatalogEntry` denormalized + blob token.

## Layout

```
/v1/
  entity/{id}/head.json          POINTER (SWR)  { id, rev, updatedAt, hash }
  entity/{id}/meta.v{rev}.json   IMMUTABLE      EntityMeta (full record)
  feed/latest/0.json             POINTER        CatalogEntry[] (soonest airing)
  feed/latest/{n}.json           immutable      CatalogEntry[]
  feed/popular/{day|week|all}    popular cache   CatalogEntry[]
  calendar/{yyyy-Www}.json       SWR 30m        CatalogEntry[] (lịch tuần)
  genre/{slug}/{page}.json       immutable      CatalogEntry[]
  status/{status}/{page}.json    immutable      CatalogEntry[]
  search/head.json               POINTER        { ver, hash }
  search/index.v{N}.json         immutable      CatalogEntry[] (ALL — resolve id + name search)
  _heads.json                    no-store       writer state (id -> {rev,hash}); not for the FE
```

`id = "{kind}:{num}"` (vd `anime:21`) — namespaced, dùng cho cross-ref
(`valueAdd.related`). Path encode `:` → `%3A`.

## Bất biến (vì sao KHÔNG nặng)

- **Mutable ⟂ Immutable**: `meta.v{rev}` immutable (cache 1y) — ghi MỘT lần/version.
  Content đổi → **rev mới → file mới**, file cũ giữ nguyên. `head.json` (pointer
  ~80B) bump rev. Idempotent: hash khác mới bump (verify: run lại data y nguyên =
  **0 ghi**; 1 ep mới = **1 ghi**). Không full-rewrite, không hash-diff thủ công.
- **Data ⟂ Blob**: `cover/banner/character.image` = token `src:<url>` (hotlink
  AniList CDN). Đổi host = đổi resolver, data y nguyên.
- **Write ⟂ Read**: producer ghi R2; FE đọc R2. State sống trong R2 (`_heads.json`)
  → job ingest stateless.

## Read flows (FE)

```
home:    GET feed/latest/0 (+ feed/popular/day)         → render card (đủ field)
detail:  GET entity/{id}/head → meta.v{rev}             → trang chi tiết
related: resolve id[] qua search/index.v{N} (CatalogEntry[]) — không fetch từng cái
search:  GET search/head → index.v{ver} → lọc in-memory
calendar:GET calendar/{yyyy-Www}                        → lịch chiếu tuần
```

## Write order (docs/ingestion.md — BẮT BUỘC)

```
1. meta.v{rev}.json     (immutable)  ← ghi TRƯỚC
2. search/index.v{N}    (immutable)
3. feed/popular, calendar, feed/latest/0  (denormalized, rebuilt)
4. entity head.json, search/head  (POINTER)  ← ghi CUỐI
5. _heads.json          (writer state)
```
Immutable trước → URL có sẵn khi pointer trỏ tới. Chết giữa chừng = file immutable
mồ côi (vô hại); site nhất quán ở rev cũ.

## Host ingest

`ingest/push-r2.mjs` (GitHub Actions, `.github/workflows/ingest.yml`) — egress
non-CF vì **AniList 403-chặn CF Worker**. `worker/` là path thay thế (cần
`RELAY_URL` → `ingest/relay.ts`). Read path không đụng API.
