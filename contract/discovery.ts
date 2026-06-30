// Watchdex — DISCOVERY contract (NGUỒN CHÂN LÝ cho catalog/detail đa vertical).
//
// Tách khỏi contract.ts (đó là contract MEDIA: title/part/blob để ĐỌC nội dung).
// File này mô tả lớp KHÁM PHÁ: card + detail cho anime / movie / game.
//
// Cả PRODUCER (ingest → ghi R2) và CONSUMER (SvelteKit SPA → đọc) bám file này.
// Thuần, không I/O. Đổi schema phá vỡ ⇒ ra /v2 + bump SCHEMA; client /v1 không vỡ.

export const SCHEMA = "v1";
const P = `/${SCHEMA}`;

// ── Vertical ────────────────────────────────────────────────────────────────
// Thêm vertical = thêm Kind + 1 nhánh Details + 1 thư mục /v1/{kind}/.
// CORE (Card/Entity) và mọi component KHÔNG đổi.
export type Kind = "anime" | "movie" | "game";
export const KINDS: readonly Kind[] = ["anime", "movie", "game"] as const;

// Chuẩn hóa xuyên vertical để card/sort/filter dùng chung 1 logic.
export type Status = "airing" | "upcoming" | "finished" | "released" | "cancelled" | "unknown";

/** Mốc thời gian THỐNG NHẤT: anime {EP 14, ts} · movie {Premiere, ts} · game {Launch, ts}.
 *  Hero/ScheduleRow/Countdown chỉ cần (label, at) → dùng chung cho cả 3 vertical. */
export interface Next { label: string; at: number } // at = unix giây

// ── Card — bản LITE cho mọi listing (home/catalog/search/facet) ─────────────
// Mang đủ facet (status, genres, year) để client lọc tại chỗ. Derive từ Entity
// lúc ingest (không tự soạn → không lệch).
export interface Card {
  kind: Kind;
  id: string;              // ổn định, trong phạm vi kind (path đã tách kind)
  slug: string;            // "{name}-{id}" — id ở ĐUÔI để parse ngược (deep-link nguội)
  title: string;
  cover: string;           // URL ảnh (hotlink nguồn CDN)
  color: string | null;    // màu chủ đạo (placeholder poster)
  score: number | null;    // CHUẨN HÓA 0–100
  year: number | null;
  status: Status;
  genres: string[];
  meta: string;            // dòng phụ dựng sẵn, vd "TV · 24 eps · 2026"
  next: Next | null;
}

// ── Ref — thumbnail tối giản cho recs/relations (không cần full Card) ────────
export interface Ref { kind: Kind; id: string; slug: string; title: string; cover: string; meta: string | null }
export interface Related extends Ref { relation: string }

export interface Stream { site: string; url: string }
export interface Character { name: string; image: string; role: string; va: string | null; vaImage: string | null }

// ── Details — discriminated theo kind (chỉ ở Entity, không ở Card) ──────────
export interface AnimeDetails { kind: "anime"; format: string | null; episodes: number | null; duration: number | null; studios: string[]; studio: string | null; source: string | null; season: string | null; aired: string | null }
export interface MovieDetails { kind: "movie"; runtime: number | null; director: string | null; cast: string[]; studios: string[]; released: string | null }
export interface GameDetails  { kind: "game";  platforms: string[]; developer: string | null; publisher: string | null; modes: string[]; released: string | null }
export type Details = AnimeDetails | MovieDetails | GameDetails;

// ── Entity — bản RICH cho trang detail (/v1/{kind}/entity/{id}.json) ─────────
export interface Entity extends Card {
  english: string | null; native: string | null; synonyms: string[];
  description: string | null; banner: string | null;
  popularity: number | null; favourites: number | null;
  tags: string[];
  details: Details;
  streams: Stream[];               // "where to watch / play / buy"
  related: Related[];
  recommendations: Ref[];
  characters: Character[];
}

// ── Payloads ────────────────────────────────────────────────────────────────
/** /v1/manifest.json — vertical nào tồn tại + lần build. */
export interface Manifest { schema: typeof SCHEMA; buildAt: number; verticals: Kind[] }

/** /v1/{kind}/index.json — POINTER per-vertical: đếm + version data + danh sách facet. */
export interface Index { kind: Kind; dataVersion: string; updatedAt: number; counts: { total: number; airing: number }; facets: string[] }

/** /v1/{kind}/home.json — payload trang home (LITE, nhúng sẵn → 1 fetch, fast paint). */
export interface Home { kind: Kind; season: string; airingCount: number; featured: Card | null; airing: Card[]; trending: Card[] }

// ── Path builders (1 NGUỒN CHÂN LÝ cho URL R2 + fetch) ──────────────────────
export const paths = {
  manifest: () => `${P}/manifest.json`,
  index: (kind: Kind) => `${P}/${kind}/index.json`,
  home: (kind: Kind) => `${P}/${kind}/home.json`,
  entity: (kind: Kind, id: string) => `${P}/${kind}/entity/${id}.json`,
  // ── reserve (chưa implement, namespace giữ chỗ; thêm sau KHÔNG phá home/entity) ──
  catalogShard: (kind: Kind, shard: string) => `${P}/${kind}/catalog/${shard}.json`,
  facet: (kind: Kind, dim: string, value: string) => `${P}/${kind}/facet/${dim}/${value}.json`,
  search: (kind: Kind) => `${P}/${kind}/search.json`,
  sitemap: (kind: Kind) => `${P}/${kind}/sitemap.xml`,
} as const;

// ── slug / id ───────────────────────────────────────────────────────────────
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
export const makeSlug = (title: string, id: string) => `${slugify(title)}-${id}`;
/** id = token sau dấu '-' cuối (id không chứa '-'). Cho deep-link nguội không cần catalog. */
export const idFromSlug = (slug: string) => slug.slice(slug.lastIndexOf("-") + 1);

export const isKind = (s: string): s is Kind => (KINDS as readonly string[]).includes(s);

// ── Cache-Control (producer set lúc PutObject; Cloudflare Cache Rules có thể override) ──
const SWR = "public, max-age=120, stale-while-revalidate=86400, stale-if-error=86400";
export const cacheControl = {
  pointer: SWR,                                              // manifest, index, home
  entity: "public, max-age=300, stale-while-revalidate=86400",
  immutable: "public, max-age=31536000, immutable",         // catalog/{shard}-{hash}
} as const;
