// Mirror of contract/discovery.ts (the producer/consumer contract). The SPA
// reads ONLY these shapes from R2 — no third-party API on the read path.
export type Kind = 'anime' | 'movie' | 'game';
export const KINDS: readonly Kind[] = ['anime', 'movie', 'game'] as const;
export const isKind = (s: string): s is Kind => (KINDS as readonly string[]).includes(s);

export type Status = 'airing' | 'upcoming' | 'finished' | 'released' | 'cancelled' | 'unknown';

/** Unified "when": anime {EP 14} · movie {Premiere} · game {Launch}. */
export interface Next { label: string; at: number }

/** Lite card — home/catalog/search/facets. Carries facet fields for in-place filtering. */
export interface Card {
	kind: Kind;
	id: string;
	slug: string;
	title: string;
	cover: string;
	color: string | null;
	score: number | null;
	year: number | null;
	status: Status;
	genres: string[];
	meta: string;
	next: Next | null;
}

/** Minimal thumbnail for recs/relations. */
export interface Ref { kind: Kind; id: string; slug: string; title: string; cover: string; meta: string | null }
export interface Related extends Ref { relation: string }

export interface Stream { site: string; url: string }
export interface Character { name: string; image: string; role: string; va: string | null; vaImage: string | null }

export interface AnimeDetails { kind: 'anime'; format: string | null; episodes: number | null; duration: number | null; studios: string[]; studio: string | null; source: string | null; season: string | null; aired: string | null }
export interface MovieDetails { kind: 'movie'; runtime: number | null; director: string | null; cast: string[]; studios: string[]; released: string | null }
export interface GameDetails { kind: 'game'; platforms: string[]; developer: string | null; publisher: string | null; modes: string[]; released: string | null }
export type Details = AnimeDetails | MovieDetails | GameDetails;

/** Rich entity — detail page. */
export interface Entity extends Card {
	english: string | null; native: string | null; synonyms: string[];
	description: string | null; banner: string | null;
	popularity: number | null; favourites: number | null;
	tags: string[];
	details: Details;
	streams: Stream[];
	related: Related[];
	recommendations: Ref[];
	characters: Character[];
}

export interface Manifest { schema: 'v1'; buildAt: number; verticals: Kind[] }
export interface Index { kind: Kind; dataVersion: string; updatedAt: number; counts: { total: number; airing: number }; facets: string[] }
export interface Home { kind: Kind; season: string; airingCount: number; featured: Card | null; airing: Card[]; trending: Card[] }
