# AGENTS.md — đọc trước

> Orientation cho AI agent / dev mới. Đọc file này → hiểu repo, biết đọc tiếp ở đâu.

## staticat là gì
**Static catalog** cho media (phim · truyện) theo **static-first / CDN-as-database**.
Đọc 100% file tĩnh trên CDN (**không server**); ghi bằng job ephemeral (**không server**).

```
WRITE (ephemeral)            STORE                 READ (static)
GitHub Actions cron ──ghi──► R2 (data + token) ──► Cloudflare CDN ──► Astro client
                            Drive/B2/R2 (blob)     Cache Rules        IndexedDB state
```

## 3 BẤT BIẾN (mental model — đừng vi phạm)
1. **Write ⟂ Read** — gặp nhau CHỈ qua file tĩnh R2. Crawler là bộ *ghi*; sập thì site đọc vẫn sống.
2. **Data ⟂ Blob** — R2 giữ data + **token** trỏ blob (`gd:`/`r2:`/`b2:`/`src:`). Byte nặng (ảnh/video) ở host khác. Đổi host = đổi resolver, **data y nguyên**.
3. **Mutable ⟂ Immutable** — CHỈ pointer nhỏ (`head.json`, `feed/latest/0`, `search/head`) tươi (SWR ngắn). Mọi payload lớn `*.v{rev}` **immutable**, cache vĩnh viễn.

## Nguồn chân lý
- **`spec/contract.yaml`** — data contract machine-readable (entities, paths, fields, TTL, examples). **CHÍNH XÁC ở đây.**
- **`contract/contract.ts`** — mirror TS của contract.yaml (types + path builders + token codec) để code dùng. *Nếu lệch → contract.yaml thắng.*
- **`spec/cache-rules.yaml`** — chính sách cache deployable.

## Repo map — cần gì đọc đó
| Bạn muốn… | Đọc |
|---|---|
| Hiểu tổng thể, vì sao thiết kế vậy | `docs/architecture.md` |
| Schema chính xác 1 file/entity + path + TTL | `spec/contract.yaml` |
| Dùng trong code (types/path/token) | `contract/contract.ts` |
| Cách crawl→ghi (thứ tự an toàn, idempotent, cron) | `docs/ingestion.md` |
| Lớp dynamic (user-store + comment, PocketBase) | `spec/dynamic.yaml` |
| Cấu hình cache CDN | `spec/cache-rules.yaml` |
| Quickstart cho người | `README.md` |

## Quy ước
- Mọi path dưới `/v1`. Đổi schema phá vỡ → ra `/v2`, bump `CONTRACT_VERSION`; client cũ không vỡ.
- Đơn vị: **work (title) → parts**. part = chương (truyện) | tập (phim).
- Payload part discriminated theo `kind`: `comic-pack` | `video-mp4` | `video-hls`.
- List view (feed/search) **denormalized** → 1 fetch là render được card.
- Ghi: **immutable TRƯỚC, pointer SAU**; idempotent (hash-based).

## Trạng thái
Pha 0 (spec) xong. TODO: `ingest/`, `.github/workflows/ingest.yml`, frontend Astro (repo riêng, import `contract.ts`).
