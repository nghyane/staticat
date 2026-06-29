# Architecture

> Vì sao thiết kế thế này. Schema chính xác xem [`spec/contract.yaml`](../spec/contract.yaml).

## Triết lý: static-first / CDN-as-database
Đẩy mọi logic về **build-time (ingest)** + **client**; CDN chỉ serve byte tĩnh. Không app server trên đường đọc → scale theo GB, không theo user; chi phí ≈ chỉ storage.

## 3 bất biến
1. **Write ⟂ Read** — bộ ghi (crawler) và bộ đọc (client) gặp nhau CHỈ qua file tĩnh R2.
2. **Data ⟂ Blob** — R2 = data + token (`gd:`/`r2:`/`b2:`/`src:`); byte nặng ở host khác, đổi host không đụng data.
3. **Mutable ⟂ Immutable** — chỉ pointer nhỏ tươi (SWR); payload `*.v{rev}` immutable, cache mãi.

## Thành phần
| Lớp | Chọn | Server? |
|---|---|---|
| Data | **R2** custom domain (10GB free ≈ 20k+ title) | không |
| CDN | **Cloudflare Cache Rules** | không |
| Frontend | **Astro** static (Pages) | không |
| Ingestion | **GitHub Actions** cron | ephemeral |
| Blob ảnh/video | **Drive / B2 / R2** (1 file/part) | không |
| Proxy blob | **bunle** Pages Fn (khi cần CORS/raw/range) | edge-only |
| User-state | **IndexedDB** | không |

## Data model — work → parts
`work (title)` có 1..N `parts`. part = chương (truyện) | tập (phim). Mỗi part trỏ 1 blob qua token.

### Payload theo profile (discriminated `kind`)
- **comic-pack** (truyện): 1 blob = các page nối tiếp; index `pages[].off/len`; đọc bằng **Range/page**. gg.js biến mất; trang đầu nhanh.
- **video-mp4** (phim đơn giản): 1 file/tập; `<video>` **seek bằng HTTP Range** native.
- **video-hls** (phim ABR): playlist + segment immutable — mọi file tĩnh, CDN ăn khớp; ingest nặng hơn (transcode).

> Điểm chung: **index nhẹ ở R2 ⟂ blob immutable ở host khác**. Range vào 1 file phục vụ cả "page truyện" lẫn "seek video".

## Pointer + immutability (vì sao update vẫn cache mạnh)
- Payload lớn `*.v{rev}` immutable → cache 1 năm.
- `head.json` = pointer ~50B, SWR 30s → cho biết `rev` hiện tại.
- Reader: `head` (tươi) → `meta.v{rev}` (cache mãi). Part mới hiện ~30s.
- Part list **chunk hoá**: chunk mới nhất versioned, chunk cũ immutable → append không ghi lại chunk cũ.

## Denormalization
`feed`/`search`/`genre` entry **tự chứa** `{title, cover, …}` → list view **1 fetch** là render. Detail view mới fetch record đầy đủ.

## Resilience
| Thành phần CHẾT | Đọc site | Nội dung mới |
|---|---|---|
| GitHub Actions (ingest) | OK | dừng tới khi hồi |
| R2 origin (blip) | OK (`stale-if-error`) | - |
| Drive (quota/ban) | OK (blob đã cache) | WARN: blob nguội lỗi |
| proxy blob | WARN: chỉ blob nguội (data đọc thẳng R2) | - |
| Cloudflare | DOWN (hiếm, SLA cao) | - |

Không app server -> không SPOF cổ điển trên đường đọc. Crawler là thành phần *ghi*, thay/sập thoải mái.

## Chi phí
R2 10GB data free (egress $0) · Pages free unlimited · Workers chỉ proxy/sync (100k/ngày free, $5/tháng=10M). MVP read-only ≈ **$0**; chi phí tăng duy nhất = **storage blob** ở host bạn chọn.

## SEO + UI/UX
SEO hiện KHÔNG cần prerender: Google render JS nên **SPA tĩnh index được**. Ưu tiên ngược lại: dồn công sức vào **UI/UX** (reader/player mượt, tải ảnh/seek nhanh, điều hướng, dark mode, responsive). Chỉ cần bổ sung nhẹ `<title>`/OG meta + `sitemap.xml` (sinh lúc ingest) cho social card — không dựng tầng SSR/prerender.

## Giới hạn
Cập nhật trễ ~TTL pointer (30s) · không real-time · comment/social cần lớp dynamic · Drive = MVP, chuyển B2/R2 khi nghiêm túc.
