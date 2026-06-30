// Mirror of contract/discovery.ts. The SPA reads ONLY these shapes from R2.
export type Kind = 'anime' | 'manga' | 'movie' | 'tv' | 'game';
export const KINDS: readonly Kind[] = ['anime', 'manga', 'movie', 'tv', 'game'] as const;
export const isKind = (s: string): s is Kind => (KINDS as readonly string[]).includes(s);
export type Status = 'airing' | 'upcoming' | 'finished' | 'cancelled' | 'unknown';

export type BlobToken = string; // "src:<url>" | "r2:<key>" | …
/** Resolve a blob token to a URL. src: is a hotlinked source CDN URL. */
export const blob = (t: BlobToken | null | undefined): string => (!t ? '' : t.startsWith('src:') ? t.slice(4) : t);

export const numOf = (id: string): string => id.slice(id.indexOf(':') + 1);
export const kindOf = (id: string): Kind => id.slice(0, id.indexOf(':')) as Kind;

export interface Schedule { nextEp: number | null; airAt: number | null }
export interface Availability { provider: string; region: string; kind: string; url: string }
export interface Character { name: string; image: BlobToken; role: string; va: string | null; vaImage: BlobToken | null }
export type Details =
	| { kind: 'anime'; format: string | null; episodes: number | null; duration: number | null; studio: string | null; source: string | null; season: string | null; aired: string | null }
	| { kind: 'manga'; format: string | null; chapters: number | null; volumes: number | null; authors: string[]; serialization: string | null; published: string | null }
	| { kind: 'movie'; runtime: number | null; director: string | null; cast: string[]; released: string | null }
	| { kind: 'tv'; seasons: number | null }
	| { kind: 'game'; platforms: string[]; developer: string | null; publisher: string | null; modes: string[]; released: string | null; screenshots: string[] };

/** /v1/entity/{kind}/{num}/head.json — pointer */
export interface EntityHead { id: string; rev: number; updatedAt: number; hash: string }

/** /v1/entity/{kind}/{num}/meta.v{rev}.json — immutable, full record */
export interface EntityMeta {
	rev: number;
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
	rating: number | null;
	ids: { anilist?: number; mal?: number; tmdb?: number };
	desc: string | null;
	availability: Availability[];
	schedule: Schedule | null;
	valueAdd: { related: string[]; recommendations: string[] };
	characters: Character[];
	details: Details;
}

/** Denormalized card for every listing (feed/genre/status/search/calendar). */
export interface CatalogEntry {
	id: string;
	kind: Kind;
	title: string;
	cover: BlobToken;
	year: number | null;
	status: Status;
	genres: string[];
	rating: number | null;
	alt?: string[];
	schedule?: Schedule | null;
	season?: string | null;
}

export interface SearchHead { ver: number; hash: string }

export const slugifyGenre = (g: string): string => g.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

/** Small display meta for a card (CatalogEntry carries no precomputed string). */
export const cardMeta = (e: CatalogEntry): string => [e.year, e.genres[0]].filter(Boolean).join(' · ');
