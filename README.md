# staticat

**Static catalog** cho media (phim · truyện) — kiến trúc **static-first / CDN-as-database**.
Đọc 100% file tĩnh trên CDN (**không server**); ghi bằng job ephemeral (**không server**).

```
WRITE (ephemeral)            STORE                 READ (static)
GitHub Actions cron  ──ghi──► R2 (data + ref)  ──► Cloudflare CDN ──► Astro client
   crawl/encode/pack         Drive/B2/R2 (blob)     Cache Rules         IndexedDB state
```

## 3 lằn ranh
- **Write ⟂ Read** — gặp nhau chỉ qua file tĩnh R2. Crawler sập → site đọc vẫn sống.
- **Data ⟂ Blob** — R2 giữ data + token ref; ảnh/video ở host khác, đổi host không đụng data.
- **Mutable ⟂ Immutable** — chỉ pointer nhỏ tươi (SWR); payload versioned immutable, cache mãi.

## Hợp cả phim lẫn truyện
- **Truyện:** part = chương → 1 blob nối các page, đọc bằng HTTP Range.
- **Phim:** part = tập → MP4 (Range seek) hoặc HLS (playlist + segment immutable).
- Khác nhau chỉ ở "payload của part"; data contract chung.

## Bắt đầu
1. Đọc **[SPEC.md](./SPEC.md)** — kiến trúc + data contract đầy đủ.
2. **[contract/contract.ts](./contract/contract.ts)** — nguồn chân lý: types + path builders + token codec.
3. Pha 0: viết `ingest/` ghi 1–2 title lên R2 + blob; curl kiểm tra.

## Layout
```
SPEC.md · README.md
contract/contract.ts        # producer + consumer cùng import
ingest/                     # crawl/encode/transcode/pack → R2 + blob (Bun)  [TODO]
.github/workflows/ingest.yml                                                  [TODO]
infra/cache-rules.md                                                          [TODO]
```
Frontend (Astro) = repo riêng, chỉ import `contract.ts` (vendor/submodule). Phụ thuộc một chiều.

## Chi phí
R2 10GB data free (≈20k+ title), egress $0, Pages free. MVP read-only ≈ **$0**; chỉ trả storage blob khi lớn.
