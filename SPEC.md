# staticat — SPEC

> **Static catalog** cho media (phim · truyện) theo kiến trúc **static-first / CDN-as-database**.
> Read path 100% file tĩnh (không server). Write path là job ephemeral (không server).
> Đây là spec của **data contract** + pipeline. Frontend là consumer độc lập.
>
> *Tên cũ: manga-cdn. Cơ chế áp dụng cho mọi catalog media — truyện (ảnh) và phim (video) chỉ khác phần "payload của part".*

---

## 0. Triết lý — 3 lằn ranh

1. **Write ⟂ Read** — bộ ghi (crawler) và bộ đọc (client) chỉ gặp nhau qua **file tĩnh trên R2**. Crawler là thành phần *ghi*, thay/sập thoải mái; site đọc vẫn sống.
2. **Data ⟂ Blob** — R2 chỉ chứa **data + ref blob** (token). Byte nặng (ảnh/video) ở host khác, tham chiếu bằng token → đổi host không đụng data.
3. **Mutable ⟂ Immutable** — chỉ vài *pointer* nhỏ (`head.json`, `feed/latest/0`) là tươi (SWR ngắn). Mọi payload lớn là **versioned + immutable** → cache vĩnh viễn.

**Hệ quả:** "server sập" vô nghĩa (không server trên đường đọc); chi phí ≈ chỉ storage; scale theo GB, không theo user.

---

## 1. Mô hình dữ liệu (chung cho phim + truyện)

```
WORK (title)  ──┬── 1 part   (phim lẻ)
                └── N parts  (series phim / truyện nhiều chương)

part = đơn vị nội dung:  chương (truyện)  |  tập/episode (phim)
```

- **work/title** — tác phẩm: id, tên, cover, genres, status, lang…
- **part** — chương hoặc tập; mỗi part trỏ tới **1 blob** ở host ảnh/video.
- **payload của part** khác nhau theo loại (xem §3).

---

## 2. Thành phần

| Lớp | Chọn | Vai trò | Server? |
|---|---|---|---|
| Storage data | **R2** (custom domain) | data + ref blob; 10GB free ≈ 20k+ title | không |
| CDN/cache | **Cloudflare Cache Rules** | TTL theo path | không |
| Frontend | **Astro** static | đọc contract, render, SEO prerender | không |
| Ingestion | **GitHub Actions** cron | crawl → encode/transcode → pack → ghi R2/blob | ephemeral |
| Blob ảnh/video | **Drive / B2 / R2** | 1 file/part (comic-pack hoặc MP4/HLS) | không |
| Proxy blob | **bunle** Pages Fn (khi cần CORS/raw/range) | cache + CORS + range-object | edge-only |
| User-state | **IndexedDB** (client) | tiến độ / thư viện | không |

---

## 3. Payload của part — 2 profile

R2 lưu **index** (`/v1/part/{partId}.json`), blob nặng ở host khác (token).

### 3.1 Comic (truyện) — "1 file / chương"
- 1 part = 1 blob = các page (webp/avif) **nối tiếp**; index ở R2 (`pages[].off/len/type`).
- Đọc: `part.json` → mỗi page **Range** vào blob → `Blob` → `<img>`.
- **gg.js biến mất** (không resolve URL động từng ảnh); trang đầu nhanh nhờ Range.

```jsonc
{ "partId":"abc:120", "titleId":"abc", "kind":"comic-pack", "blob":"gd:F120",
  "pages":[ {"off":0,"len":142331,"type":"webp","w":800,"h":1200} ] }
```

### 3.2 Video (phim) — MP4-range hoặc HLS
- **MP4 progressive** (đơn giản, 1 chất lượng): 1 file/tập, `<video>` seek bằng **HTTP Range** native. Range-object cache hợp hoàn hảo.
- **HLS/DASH** (đa bitrate ABR): playlist (`.m3u8`, SWR ngắn hoặc immutable-per-version) + segment (`.ts/.m4s`, **immutable**). Mọi file tĩnh → CDN ăn khớp; ingestion nặng hơn (transcode + segment).

```jsonc
// MP4
{ "partId":"mov:1", "titleId":"mov", "kind":"video-mp4", "blob":"r2:mov/1.mp4",
  "dur":5400, "w":1920, "h":1080 }
// HLS
{ "partId":"mov:1", "titleId":"mov", "kind":"video-hls", "playlist":"r2:mov/1/master.m3u8",
  "dur":5400, "variants":[{"h":1080,"bw":5000000},{"h":720,"bw":2800000}] }
```

> **Điểm chung:** index (R2, nhẹ, queryable) ⟂ blob (host khác, immutable, cache CDN). Range vào 1 file phục vụ cả "page truyện" lẫn "seek video".

### 3.3 Host blob
| Host | Storage | Quota/ToS | Worker đọc |
|---|---|---|---|
| Google Drive | free | ⚠️ quota/ban — chỉ MVP | cần (raw+range+CORS) |
| Backblaze B2 | rẻ | ổn | không (custom domain) |
| R2 bucket blob | pay (egress $0) | ổn nhất | không |

Token: `gd:<id>` · `r2:<key>` · `b2:<key>` · `src:<url>`. **Resolver** map token→URL; đổi host = đổi resolver, **data y nguyên**.

---

## 4. Data contract — layout `/v1` trên R2

```
/v1/
├─ feed/
│   ├─ latest/0.json          SWR 30s    # denormalized, hot
│   ├─ latest/{n}.json        immutable
│   └─ popular/{period}.json  SWR 5m     # day|week|all
├─ genre/{slug}/{page}.json   immutable
├─ title/{id}/
│   ├─ head.json              SWR 30s    # POINTER — mutable duy nhất của title
│   ├─ meta.v{rev}.json       immutable
│   └─ parts/{chunk}.v{n}.json immutable # chunk danh sách part
├─ part/{partId}.json         immutable  # INDEX payload (comic/video)
└─ search/
    ├─ head.json              SWR 60s    # POINTER -> {ver}
    └─ index.v{N}.json        immutable
```

### 4.1 Shapes (xem `contract/contract.ts` là nguồn chân lý)
```jsonc
// title/{id}/head.json     {id, rev, latestAt, chunks:["c0","c1.v3"]}
// title/{id}/meta.v{rev}   {id, kind:"comic"|"video", title, alt[], cover,
//                           author?, status, genres[], lang, desc}
// title/{id}/parts/{c}.v{n}  [{partId, no, label?, date}]   # newest-first
// part/{partId}.json       (xem §3 — discriminated theo "kind")
// feed/latest/0.json       [{titleId, kind, title, cover, partId, no, at}]  # tự chứa
// search/index.v{N}.json   [{id, kind, title, alt[], cover}]
```

### 4.2 Versioned pointer
- Payload lớn = `*.v{rev}` **immutable** (cache 1 năm). `head.json` = pointer nhỏ (~50B) SWR 30s.
- Reader: `head` (tươi) → `meta.v{rev}` (cache mãi). Part mới hiện trong ~30s.
- Part list **chunk hoá**: chunk mới nhất versioned, chunk cũ immutable → thêm part không ghi lại chunk cũ.

---

## 5. Write path — ingestion (GitHub Actions cron)

**State sống TRONG R2** → job stateless: đọc state → diff nguồn → ghi delta.

### 5.1 Thứ tự ghi an toàn
```
1. encode(ảnh)/transcode(video) -> PACK blob part -> upload (immutable)
2. ghi /v1/part/{partId}.json                 (immutable)
3. ghi /v1/title/{id}/parts/{chunk}.v{n+1}    (immutable)
4. bump /v1/title/{id}/head.json (rev++)      (POINTER — GHI CUỐI)
5. prepend /v1/feed/latest/0.json             (entry denormalized)
6. mark search dirty -> cron rebuild index.v{N+1} + bump search/head
```
- **Immutable TRƯỚC, pointer SAU** → chết giữa chừng không để lại trạng thái dở.
- **Idempotent** (hash-based) → run sau bù run lỗi. `concurrency group` → 1 run/lúc.

### 5.2 Workflow (rút gọn)
```yaml
on:
  schedule: [{ cron: '*/15 * * * *' }]
  workflow_dispatch:
concurrency: { group: ingest, cancel-in-progress: false }
jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install && bun run ingest
        env: { R2_KEY: ${{secrets.R2_KEY}}, R2_SECRET: ${{secrets.R2_SECRET}},
               R2_BUCKET: ${{secrets.R2_BUCKET}}, BLOB_CRED: ${{secrets.BLOB_CRED}} }
```

---

## 6. Caching (Cloudflare Cache Rules)

| Path | Cache-Control |
|---|---|
| `*/head.json`, `feed/latest/0`, `search/head` | `max-age=30, stale-while-revalidate=300, stale-if-error=86400` |
| `feed/popular/*` | `max-age=300, swr=3600` |
| `*.v*.json`, `part/*`, `genre/*`, HLS segment | `max-age=31536000, immutable` |
| blob ảnh/video (qua proxy) | `immutable`, range-object cache (206→200) |

Bật **Tiered Cache**; cân nhắc **Cache Reserve** nếu long-tail nhiều.

---

## 7. User-state · Resilience · Chi phí

- **State:** MVP client-only (IndexedDB) — tiến độ/thư viện, **0 backend**. Đa thiết bị (sau) = Worker+D1, content vẫn tĩnh.
- **Resilience:** GitHub Actions chết → đọc OK, chỉ ngừng nội dung mới. R2 blip → `stale-if-error`. Drive quota → blob nguội lỗi, đã-cache OK. **Không app server ⇒ không SPOF đường đọc.**
- **Chi phí:** R2 10GB data free (≈20k+ title); egress **$0**; Pages free unlimited; Workers chỉ proxy/sync (100k/ngày free). MVP read-only ≈ **$0**; chi phí tăng duy nhất = **storage blob**.

---

## 8. MVP roadmap

| Pha | Làm | Kết quả |
|---|---|---|
| 0 | chốt `/v1` + `contract.ts` + ingest 1–2 title | curl ra JSON + blob |
| 1 | Astro: Home + Title + Player/Reader (1-file/part), progress IndexedDB | đọc/xem được, 0 server |
| 2 | search client-index + genre + popular | duyệt/tìm |
| 3 | SEO prerender + sitemap | traffic |
| 4 (tùy) | account/sync (Worker+D1) | đa thiết bị |

---

## 9. Non-goals / giới hạn

- Cập nhật trễ = TTL pointer (~30s).
- Không real-time; comment/social cần lớp dynamic.
- SEO **bắt buộc** prerender (đừng SPA thuần).
- Video ABR (HLS) cần ingestion transcode nặng — bắt đầu MP4-range cho đơn giản.
- Host blob: Drive = MVP; chuyển B2/R2 khi nghiêm túc (giữ token để migrate không đau).

---

## 10. Repo layout

```
staticat/
├─ SPEC.md
├─ README.md
├─ contract/contract.ts    # NGUỒN CHÂN LÝ: types + path builders + token codec
├─ ingest/                 # crawl/encode/transcode/pack -> R2 + blob (Bun)
├─ .github/workflows/ingest.yml
└─ infra/cache-rules.md
```
> Frontend (Astro) = **consumer riêng**, chỉ import `contract.ts` (vendor/submodule) — phụ thuộc một chiều, đọc HTTP.
