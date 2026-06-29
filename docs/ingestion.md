# Ingestion (write path)

> Crawl → encode/transcode → pack → ghi R2 + blob. Chạy bằng **job ephemeral** (GitHub Actions cron) — **không server**.

## State sống TRONG R2 → job stateless
Mỗi run: **đọc state hiện tại từ R2 → diff vs nguồn → ghi delta.** Không DB, không process giữ state. File đã publish CHÍNH LÀ state.

## Thứ tự ghi an toàn (BẮT BUỘC đúng)
```
1. encode(ảnh)/transcode(video) → PACK blob part → upload host blob   (immutable)
2. ghi /v1/part/{partId}.json                                         (immutable)
3. ghi /v1/title/{id}/parts/{chunk}.v{n+1}.json                       (immutable)
4. bump /v1/title/{id}/head.json  (rev++, latestAt)                   (POINTER — GHI CUỐI)
5. prepend /v1/feed/latest/0.json  (entry denormalized)
6. mark search dirty → rebuild /v1/search/index.v{N+1} + bump search/head
```
**Vì sao thứ tự này:** ghi immutable trước → URL mới có sẵn ngay khi pointer trỏ tới. Nếu bump pointer trước, sẽ có khoảng `head` trỏ `v138` mà file chưa tồn tại. Đảo thứ tự là an toàn — chết giữa chừng chỉ để lại file immutable mồ côi (vô hại), site nhất quán ở `rev` cũ.

## Idempotent
- Blob content-addressed (hash) → upload lại = no-op/dedup.
- Diff theo nguồn → run sau **bù** run lỗi/miss; không cần recovery thủ công.
- `concurrency group` (GitHub Actions) → 1 run/lúc, chống race pointer.

## Pack 1 file/part (comic)
- Nối các page (webp/avif đã encode) thành 1 blob; ghi nhớ `off/len/type/w/h` mỗi page.
- Ghi mảng đó vào `/v1/part/{partId}.json` (xem `PartIndex.comic-pack` trong contract).
- Upload blob lên host (Drive/B2/R2). **File-gói không qua lh3** (lh3 chỉ ảnh thật) → raw download qua proxy.

## Workflow (GitHub Actions)
```yaml
# .github/workflows/ingest.yml
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
        env:
          R2_KEY:    ${{ secrets.R2_KEY }}     # write-only 1 bucket
          R2_SECRET: ${{ secrets.R2_SECRET }}
          R2_BUCKET: ${{ secrets.R2_BUCKET }}
          BLOB_CRED: ${{ secrets.BLOB_CRED }}   # Drive SA / B2 key tuỳ host
```

## Lưu ý
- Cron GH Actions trễ 5–15' → ổn với phim/truyện. Cần đúng giờ → Cloudflare Cron Trigger làm dispatcher.
- Crawl > 6h → chia nhỏ (N title/run, xoay vòng); tiến độ lưu trong R2.
- Alternatives: Railway **Cron** (đừng always-on = server lại), Cloud Run Jobs, Lambda — đều "no server".
- Secret R2 scope **write 1 bucket**; tách khỏi repo frontend.
