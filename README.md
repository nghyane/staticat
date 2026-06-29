# staticat

Static catalog cho media (phim · truyện) — kiến trúc static-first / CDN-as-database.
Đọc 100% file tĩnh trên CDN (không server); ghi bằng job ephemeral (không server).

```
WRITE (ephemeral)            STORE                 READ (static)
GitHub Actions cron  --ghi--> R2 (data + token) --> Cloudflare CDN --> Astro client
   crawl/encode/pack         Drive/B2/R2 (blob)     Cache Rules        IndexedDB state
```

## 3 bất biến
- Write ⟂ Read - gặp nhau chỉ qua file tĩnh R2. Crawler sập -> site đọc vẫn sống.
- Data ⟂ Blob - R2 giữ data + token ref; ảnh/video ở host khác, đổi host không đụng data.
- Mutable ⟂ Immutable - chỉ pointer nhỏ tươi (SWR); payload versioned immutable, cache mãi.

## Hợp cả phim lẫn truyện
- Truyện: part = chương -> 1 blob nối các page, đọc bằng HTTP Range.
- Phim: part = tập -> MP4 (Range seek) hoặc HLS (playlist + segment immutable).
- Khác nhau chỉ ở "payload của part"; data contract chung.

## Đọc theo thứ tự (agent + người)
1. [AGENTS.md](./AGENTS.md) - orientation, map repo, 3 bất biến.
2. [docs/architecture.md](./docs/architecture.md) - vì sao thiết kế vậy.
3. [spec/contract.yaml](./spec/contract.yaml) - NGUỒN CHÂN LÝ: schema/path/TTL/example.
4. [contract/contract.ts](./contract/contract.ts) - mirror TS để code dùng.
5. [docs/ingestion.md](./docs/ingestion.md) - write path (thứ tự an toàn, cron).
6. [spec/cache-rules.yaml](./spec/cache-rules.yaml) - chính sách cache.

## Layout
```
AGENTS.md · README.md
docs/architecture.md · docs/ingestion.md
spec/contract.yaml · spec/cache-rules.yaml
contract/contract.ts
ingest/                       # crawl/encode/transcode/pack -> R2 + blob (Bun)  [TODO]
.github/workflows/ingest.yml                                                    [TODO]
```
Frontend (Astro) = repo riêng, chỉ import `contract.ts` (vendor/submodule). Phụ thuộc một chiều.

## Roadmap
| Pha | Làm | Kết quả |
|---|---|---|
| 0 | chốt `/v1` + `contract.ts` + ingest 1-2 title | curl ra JSON + blob (xong: spec) |
| 1 | Astro: Home + Title + Player/Reader (1 file/part), progress IndexedDB | đọc/xem được |
| 2 | search client-index + genre + popular | duyệt/tìm |
| 3 | đánh bóng UI/UX + sitemap nhẹ | trải nghiệm mượt |
| 4 (tùy) | account/sync (Worker+D1) | đa thiết bị |

SEO không cần prerender (Google render JS) -> tập trung UI/UX. Xem `docs/architecture.md`.

## Chi phí
R2 10GB data free (≈20k+ title), egress $0, Pages free. MVP read-only ≈ $0; chỉ trả storage blob khi lớn.
