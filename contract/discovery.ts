// Watchdex DISCOVERY contract — bám spec/contract.yaml (base) +
// docs/variant-discovery.md (variant). Lệch → spec/contract.yaml THẮNG.
//
// 3 bất biến: Write⟂Read · Data⟂Blob · Mutable⟂Immutable.
// Entity = head.json (pointer, SWR) + meta.v{rev}.json (immutable, cache 1y).
// Listing = CatalogEntry[] denormalized (feed/genre/status/search/calendar).
// Đổi schema phá vỡ → /v2 + bump SCHEMA; client cũ không vỡ.

export const SCHEMA = 'v1';
const P = `/${SCHEMA}`;
const enc = encodeURIComponent;

// ── Blob token (Data⟂Blob): data trỏ blob bằng token, đổi host không đụng data ─
export type BlobHost = 'src' | 'r2' | 'b2' | 'gd';
export type BlobToken = `${BlobHost}:${string}`;
export const blobToken = (host: BlobHost, ref: string) => `${host}:${ref}` as BlobToken;
export function parseBlob(t: BlobToken): { host: BlobHost; ref: string } {
	const i = t.indexOf(':');
	return { host: t.slice(0, i) as BlobHost, ref: t.slice(i + 1) };
}

// ── Vertical / status (chuẩn hóa xuyên kind) ─────────────────────────────────
export type Kind = 'anime' | 'movie' | 'tv' | 'game';
export const KINDS: readonly Kind[] = ['anime', 'movie', 'tv', 'game'] as const;
export const isKind = (s: string): s is Kind => (KINDS as readonly string[]).includes(s);
export type Status = 'airing' | 'upcoming' | 'finished' | 'cancelled' | 'unknown';

// id = "{kind}:{num}" (vd "anime:21") — namespaced, dùng cho cross-ref.
export const makeId = (kind: Kind, num: string | number) => `${kind}:${num}`;
export const kindOf = (id: string) => id.slice(0, id.indexOf(':')) as Kind;
export const numOf = (id: string) => id.slice(id.indexOf(':') + 1);

// ── EntityHead — POINTER (mutable duy nhất của entity), SWR ──────────────────
export interface EntityHead {
	id: string;
	rev: number; // tăng mỗi lần content đổi (idempotent: hash khác → rev++)
	updatedAt: number; // epoch s
	hash: string; // content hash của meta hiện tại (để idempotent)
}

// ── EntityMeta — meta.v{rev}.json IMMUTABLE: bản ghi đầy đủ ──────────────────
export interface Availability { provider: string; region: string; kind: string; url: string }
export interface Schedule { nextEp: number | null; airAt: number | null } // airAt epoch s
export interface Character { name: string; image: BlobToken; role: string; va: string | null; vaImage: BlobToken | null }
/** Mở rộng tuỳ kind (không phá core). */
export type Details =
	| { kind: 'anime'; format: string | null; episodes: number | null; duration: number | null; studio: string | null; source: string | null; season: string | null; aired: string | null }
	| { kind: 'movie'; runtime: number | null; director: string | null }
	| { kind: 'tv'; seasons: number | null }
	| { kind: 'game'; platforms: string[]; developer: string | null };

export interface EntityMeta {
	id: string;
	kind: Kind;
	title: string;
	alt: string[];
	native: string | null;
	year: number | null;
	cover: BlobToken;
	banner: BlobToken | null;
	color: string | null;
	genres: string[];
	tags: string[];
	status: Status;
	rating: number | null; // 0–100
	ids: { anilist?: number; mal?: number; tmdb?: number };
	desc: string | null;
	availability: Availability[]; // "where to watch"
	schedule: Schedule | null;
	valueAdd: { related: string[]; recommendations: string[] }; // id[] (đã prune nội bộ)
	characters: Character[];
	details: Details;
}

// ── CatalogEntry — card denormalized cho MỌI listing (1 fetch render được) ────
export interface CatalogEntry {
	id: string;
	kind: Kind;
	title: string;
	cover: BlobToken;
	year: number | null;
	status: Status; // → lọc client-side
	genres: string[]; // → lọc client-side
	rating: number | null;
	alt?: string[]; // search
	schedule?: Schedule | null; // countdown trên card
	season?: string | null; // /season browse
}

/** Derive CatalogEntry từ EntityMeta — pure pick, không soạn tay. */
export function toCatalogEntry(m: EntityMeta): CatalogEntry {
	return { id: m.id, kind: m.kind, title: m.title, cover: m.cover, year: m.year, status: m.status, genres: m.genres, rating: m.rating, alt: m.alt, schedule: m.schedule };
}

// ── SearchHead — pointer cho search index hiện tại ──────────────────────────
export interface SearchHead { ver: number }

// ── Path builders (1 NGUỒN CHÂN LÝ) ─────────────────────────────────────────
// id "{kind}:{num}" → path "/entity/{kind}/{num}/…" (no ':' in keys → no
// encoding pitfalls; readable; R2/CDN friendly).
const idPath = (id: string) => id.replace(':', '/');
export const paths = {
	entityHead: (id: string) => `${P}/entity/${idPath(id)}/head.json`,
	entityMeta: (id: string, rev: number) => `${P}/entity/${idPath(id)}/meta.v${rev}.json`,
	feedLatest: (page: number) => `${P}/feed/latest/${page}.json`,
	feedPopular: (period: 'day' | 'week' | 'all') => `${P}/feed/popular/${period}.json`,
	genre: (slug: string, page: number) => `${P}/genre/${slug}/${page}.json`,
	status: (status: Status, page: number) => `${P}/status/${status}/${page}.json`,
	calendar: (week: string) => `${P}/calendar/${week}.json`, // week = "2026-W27"
	searchHead: () => `${P}/search/head.json`,
	searchIndex: (ver: number) => `${P}/search/index.v${ver}.json`,
} as const;

// ── Cache-Control (spec/cache-rules.yaml) ───────────────────────────────────
export const cacheControl = {
	pointer: 'public, max-age=30, stale-while-revalidate=300, stale-if-error=86400', // head, feed/latest/0, search/head
	popular: 'public, max-age=300, stale-while-revalidate=3600', // feed/popular
	immutable: 'public, max-age=31536000, immutable', // meta.v{rev}, index.v{N}, genre, feed/latest≥1
} as const;

// ── Lọc client-side trên 1 listing đã tải (genre/status/feed/search) ────────
export interface CatalogFilter { name?: string; genre?: string; status?: Status; kind?: Kind }
export function filterEntries(list: CatalogEntry[], f: CatalogFilter): CatalogEntry[] {
	const q = f.name?.trim().toLowerCase();
	return list.filter(
		(e) =>
			(!f.kind || e.kind === f.kind) &&
			(!f.genre || e.genres.includes(f.genre)) &&
			(!f.status || e.status === f.status) &&
			(!q || e.title.toLowerCase().includes(q) || (e.alt ?? []).some((a) => a.toLowerCase().includes(q)))
	);
}
