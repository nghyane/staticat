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
`feed`/`search`/`genre`/`status` entry là **CatalogEntry tự chứa** `{title, cover, status, genres[], latest}` → list view **1 fetch** là render. Detail view mới fetch record đầy đủ.

## Lọc & tìm kiếm (không server)
Mỗi facet = **1 listing tĩnh dựng sẵn** (kiểu Hitomi nozomi). Vì entry mang đủ facet, client refine tại chỗ.

| Truy vấn | Cách |
|---|---|
| Theo **tên** | tải `search/index.v{N}` (CatalogEntry[]) -> lọc substring/fuzzy in-memory |
| Theo **thể loại** | `GET genre/{slug}/{page}` |
| Theo **tình trạng** | `GET status/{status}/{page}` hoặc lọc client-side trên `.status` |
| **Kết hợp AND** | tải facet NHỎ NHẤT -> lọc client-side trên `.genres`/`.status`/`.title` (`filterEntries()` trong contract.ts) |
| **Sắp xếp** | precompute biến thể (latest/popular) hoặc sort client-side trên page đã tải |

**Catalog lớn (tránh tải nguyên facet):** mỗi facet = **nozomi id-list** (mảng id sorted); client tải các id-list cần rồi **INTERSECT** (set giao) — đúng cơ chế Hitomi; tên = B-tree Range -> id-list; intersect xong resolve id -> CatalogEntry. Không product explosion, không server.

Ingest **dựng lại** các facet (genre/status/search) khi catalog đổi (xem `docs/ingestion.md`).

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

## SEO + render (data-light prerender)
> **Đính chính** giả định cũ ("SPA tĩnh đủ SEO, khỏi prerender"): SAI. SPA thuần CSR trả `<head>` rỗng cho mọi crawler không-JS — social/AI (Facebook, Zalo, **ClaudeBot, GPTBot, Perplexity**) chỉ đọc HTML đầu → preview trắng; Googlebot có render JS nhưng **trễ (giờ→tuần) + rate-limited + fail im lặng**. Site tham chiếu **AniList thực ra SSR + hydrate** (`data-server-rendered`, OG/JSON-LD render sẵn), không phải CSR thuần — nó SEO tốt *vì* có HTML render-server.

**Không tồn tại "SPA không render-server mà SEO tốt"** — chỉ khác render LÚC NÀO. Hợp static-first: render **lúc build (prerender)**, KHÔNG SSR runtime, KHÔNG backend trên đường đọc. Không dùng dynamic rendering (sniff UA) — Google đã bỏ khuyến nghị, dễ lỗi với AI bot.

### Data-light prerender
Landing (`/`, `/{kind}`, `/genre/{slug}`) prerender ra HTML tĩnh nhưng **chỉ bake KHUNG SEO bất biến**:
- `<title>`/description/canonical/OG + **JSON-LD** (CollectionPage) + **link nội bộ** (genre nav) + copy/h1.
- KHÔNG bake list động (card grid) → HTML ~data-independent.

List động **hydrate client-side từ R2** (xem Client data layer). Hệ quả:
- Crawler/social/AI: nhận đủ phần SEO (link + meta + JSON-LD) ngay trong HTML đầu tiên.
- User: list luôn tươi từ R2 — **không rebuild khi data đổi** (cron ingest).
- Rebuild chỉ khi đổi **cấu trúc** (genre/vertical mới — hiếm); có thể tự động qua Pages deploy hook.

Detail (long-tail, hàng nghìn): để **SPA** (Google tự render JS); surface qua **`sitemap.xml`** (sinh lúc ingest, liệt kê mọi URL).

Routing (Cloudflare Pages): trang prerendered nằm trong `_routes.json` **exclude** → serve static thuần (0 compute); chỉ route SPA mới chạm worker fallback. Giữ đúng bất biến **không server trên đường đọc** cho landing.

**UI/UX vẫn ưu tiên cao** (reader/player mượt, ảnh/seek nhanh, điều hướng, dark mode, responsive) — prerender chỉ là tầng SEO mỏng phủ lên SPA, không đánh đổi trải nghiệm.

## Client data layer (SWR)
Phần động fetch ở client qua **lớp query (TanStack Query)** đặt TRÊN contract, không thay nó:
- Mỗi collection = 1 "recipe" (`catalog`/`genre`/`feed`/`popular`); page khai báo `createQuery(recipe)` thay vì tự `onMount`+fetch.
- Miễn phí: **SWR cache** (quay lại trang = tức thì), **dedup** (nhiều page chia 1 fetch), **background refetch** quá `staleTime` (= nhịp ingest).
- Vẫn đọc `head` (tươi) → `meta.v{rev}` (immutable) như contract; query chỉ là tầng cache/điều phối, không phá **Write ⟂ Read**.

## Giới hạn
Cập nhật trễ ~TTL pointer (30s) · không real-time · comment/social cần lớp dynamic · Drive = MVP, chuyển B2/R2 khi nghiêm túc.
