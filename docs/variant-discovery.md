# Variant: discovery (data-aggregator, AI-era)

> Biến thể của staticat: KHÔNG host content (chương/tập). Thay vào đó là **catalog metadata + giá trị tự thêm** (xem ở đâu / lịch chiếu / so sánh) trên **API chính thống**.
> Mục tiêu: **bền + autopilot (Cloudflare cron) + view tự nhiên 2026 (Google + AI) + monetize không cần affiliate (ad/donate)**.

## Vì sao biến thể này (4 tiêu chí)
- **Bền**: nguồn = API ổn định (TMDB/IGDB/AniList), hợp pháp (metadata + value-add), cầu evergreen, không scrape mong manh.
- **Autopilot**: ingestion NHẸ (API JSON -> R2) -> chạy trọn trên **Cloudflare Cron Trigger** (Worker), không VPS/GitHub Actions/pipeline ảnh.
- **View 2026**: data structured -> JSON-LD/Schema.org -> Google rich-result + AI cite; programmatic entity pages phủ long-tail.
- **Monetize**: ad (Ezoic/AdSense) + donate; affiliate là upside (game-key/e-commerce nội địa), KHÔNG phụ thuộc.

## Stack 100% Cloudflare + API (autopilot, ~$0)
```
Cron Worker ──fetch API delta──► transform ──R2 binding──► R2 (data, free 10GB)
                                                              │
Astro static (Pages, free) ◄── đọc ──────────────────────────┘
Cover: hotlink image.tmdb.org / AniList CDN   (0 storage, CORS-ok, ổn định)
Monetize: Ads + Donate
```
Khác base staticat: **không có part/blob/reader**. Giá trị = availability + schedule + comparison.

## Data — DiscoveryEntity (metadata, không blob)
```jsonc
// /v1/entity/{id}.json   (immutable theo rev)
{ "id":"anime:21", "kind":"anime|movie|tv|game",
  "title":"...", "alt":["..."], "year":2020,
  "cover":"src:https://s4.anilist.co/...",          // hotlink CDN nguồn
  "genres":["action"], "status":"airing|finished",
  "rating": 84, "ids": { "anilist":21, "mal":21, "tmdb":null },
  "availability":[ {"provider":"Netflix","region":"VN","kind":"sub","url":"..."} ],
  "schedule":{ "nextEp":1078, "airAt":1782750000 },   // cho lịch chiếu
  "valueAdd":{ "whereToWatch":true, "related":["anime:1735"] } }
```
Tái dùng pattern base: `head.json` pointer + `*.v{rev}` immutable + feed/genre/status facet (CatalogEntry), thêm:
```
/v1/calendar/{yyyy-ww}.json   SWR 30m   # lịch chiếu tuần (recurring traffic)
/v1/availability/{provider}/{page}.json  immutable  # "có gì trên Netflix VN"
```

## Ingestion — Cloudflare Cron Worker (delta + chunk)
```
Cron Trigger (mỗi N giờ):
  1. fetch DELTA: AniList updatedAt > lastSync  |  TMDB /changes
  2. (chunk: mỗi tick 1 lát, xoay vòng; Queues/Workflows nếu cần durable)
  3. transform -> DiscoveryEntity
  4. ghi R2 qua R2 binding (KHÔNG cần S3 creds)
  5. bump head/calendar/feed/search pointer
```
- Delta -> nhẹ -> không đụng CPU/subrequest limit của Worker.
- State sống trong R2 (stateless job).

## AI-citeable (view 2026)
- **JSON-LD** mỗi entity page (Schema.org Movie/TVSeries/VideoGame) -> Google rich-result + AI Overview trích.
- **sitemap.xml** + **llms.txt** (sinh lúc ingest) -> AI crawler/agent đọc.
- **Programmatic** 1 page/entity (+ per-region cho "xem ở đâu") -> long-tail.
- **Unique value-add** (xem ở đâu / lịch / so sánh) -> AI cite *data*, không phải prose.

## Monetize (không cần affiliate network)
- **Ads instant** (Adsterra/Ezoic ngày 1 -> AdSense khi sạch+lớn). Cost ~$0 -> RPM thấp vẫn lãi.
- **Donate** (Ko-fi/Patreon) — 0 duyệt.
- Upside: affiliate game-key / e-commerce nội địa (AccessTrade/Involve Asia) — KHÔNG phụ thuộc.

## MVP roadmap
| Pha | Làm | Kết quả |
|---|---|---|
| 0 | Cron Worker: AniList delta -> R2 cho ~vài trăm anime + calendar tuần | curl ra entity + /calendar |
| 1 | Astro: entity page (+JSON-LD) + lịch chiếu + listing genre/status | site index được |
| 2 | "xem ở đâu" (availability) + search client-index + sitemap/llms.txt | AI/Google cite |
| 3 | Ads + donate + đánh bóng UI/UX | dòng tiền + trải nghiệm |

## Caveat
- **ToS/attribution**: TMDB/IGDB cần ghi nguồn + điều khoản; AniList fair-use. Tuân thủ -> bền.
- **Worker limit**: dùng delta + chunk; nặng -> Queues/Workflows.
- **Đừng thin-mirror API** (Google demote) -> bắt buộc value-add (xem ở đâu/lịch/so sánh) để unique.
- Cover hotlink: chọn nguồn CDN ổn định (AniList/TMDB OK); nếu rot -> mirror sang R2 (token `r2:`).
