// staticat — data contract (NGUỒN CHÂN LÝ)
//
// Cả PRODUCER (ingest → ghi R2) và CONSUMER (frontend → đọc) import file này.
// Giữ thuần (không I/O, không dep) để vendor/submodule sang frontend dễ dàng.
// Đổi schema = ra /v2 + bump CONTRACT_VERSION; client cũ không vỡ.

export const CONTRACT_VERSION = "v1";
const P = `/${CONTRACT_VERSION}`;

// ── Blob token: data trỏ blob bằng token, đổi host không đụng data ───────────
export type BlobToken = `gd:${string}` | `r2:${string}` | `b2:${string}` | `src:${string}`;
export type BlobHost = "gd" | "r2" | "b2" | "src";

export function parseBlob(token: BlobToken): { host: BlobHost; ref: string } {
  const i = token.indexOf(":");
  return { host: token.slice(0, i) as BlobHost, ref: token.slice(i + 1) };
}
export const blobToken = (host: BlobHost, ref: string) => `${host}:${ref}` as BlobToken;

// ── Work / part ──────────────────────────────────────────────────────────────
export type WorkKind = "comic" | "video";
export type Status = "ongoing" | "completed" | "hiatus";

/** title/{id}/head.json — POINTER (mutable duy nhất của title). */
export interface TitleHead {
  id: string;
  rev: number;
  latestAt: number;        // epoch s của part mới nhất
  chunks: string[];        // vd ["c0", "c1.v3"] — chunk mới nhất versioned
}

/** title/{id}/meta.v{rev}.json — immutable. */
export interface TitleMeta {
  id: string;
  kind: WorkKind;
  title: string;
  alt: string[];
  cover: BlobToken;
  author?: string | null;
  status: Status;
  genres: string[];
  lang: string;
  desc: string;
}

/** Một dòng trong title/{id}/parts/{chunk}.v{n}.json — newest-first. */
export interface PartRef {
  partId: string;
  no: string;              // "120", "1.5"…
  label?: string | null;   // tên chương/tập tuỳ chọn
  date: number;            // epoch s
}

// ── Part payload (discriminated theo kind) ──────────────────────────────────
export interface PagePos { off: number; len: number; type: "webp" | "avif" | "jpeg"; w: number; h: number; }

/** part/{partId}.json — comic: index các page trong 1 blob nối tiếp. */
export interface ComicPart { partId: string; titleId: string; kind: "comic-pack"; blob: BlobToken; pages: PagePos[]; }
/** part/{partId}.json — video MP4 progressive (seek bằng HTTP Range). */
export interface VideoMp4Part { partId: string; titleId: string; kind: "video-mp4"; blob: BlobToken; dur: number; w: number; h: number; }
/** part/{partId}.json — video HLS (playlist + segment immutable). */
export interface VideoHlsPart { partId: string; titleId: string; kind: "video-hls"; playlist: BlobToken; dur: number; variants: { h: number; bw: number }[]; }
export type PartIndex = ComicPart | VideoMp4Part | VideoHlsPart;

// ── Feed / search (denormalized → list view 1 fetch) ────────────────────────
export interface FeedEntry { titleId: string; kind: WorkKind; title: string; cover: BlobToken; partId: string; no: string; at: number; }
export interface SearchEntry { id: string; kind: WorkKind; title: string; alt: string[]; cover: BlobToken; }
export interface SearchHead { ver: number; }

// ── Path builders (1 nguồn chân lý cho URL) ─────────────────────────────────
export const paths = {
  titleHead: (id: string) => `${P}/title/${id}/head.json`,
  titleMeta: (id: string, rev: number) => `${P}/title/${id}/meta.v${rev}.json`,
  partsChunk: (id: string, chunk: string) => `${P}/title/${id}/parts/${chunk}.json`,
  part: (partId: string) => `${P}/part/${encodeURIComponent(partId)}.json`,
  feedLatest: (page: number) => `${P}/feed/latest/${page}.json`,
  feedPopular: (period: "day" | "week" | "all") => `${P}/feed/popular/${period}.json`,
  genre: (slug: string, page: number) => `${P}/genre/${slug}/${page}.json`,
  searchHead: () => `${P}/search/head.json`,
  searchIndex: (ver: number) => `${P}/search/index.v${ver}.json`,
} as const;

// ── Cache-Control (producer set lúc PutObject; Cache Rules có thể override) ──
const SWR = "public, max-age=30, stale-while-revalidate=300, stale-if-error=86400";
const IMMUTABLE = "public, max-age=31536000, immutable";
export const cacheControl = {
  pointer: SWR,            // head.json, feed/latest/0, search/head
  popular: "public, max-age=300, stale-while-revalidate=3600",
  immutable: IMMUTABLE,    // *.v*, part/*, genre/*, segment
} as const;
