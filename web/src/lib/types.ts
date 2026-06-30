// The R2 contract shape. The frontend reads ONLY this (via catalog.ts) — no
// third-party API on the read path. Produced by the ingest job from AniList.
export interface Stream { site: string; url: string }
export interface Mini { id: number; slug: string; title: string; cover: string; format: string | null; type: string }
export interface Related extends Mini { relation: string }
export interface Character { name: string; image: string; role: string; va: string | null; vaImage: string | null }
export interface Anime {
	id: number; idMal: number | null; slug: string;
	title: string; english: string | null; native: string | null; synonyms: string[];
	description: string | null;
	cover: string; color: string | null; banner: string | null;
	score: number | null; popularity: number | null; favourites: number | null;
	format: string | null; episodes: number | null; duration: number | null;
	status: string; source: string | null; season: string | null; year: number | null; aired: string | null;
	genres: string[]; tags: string[]; studios: string[]; studio: string | null;
	nextEp: { episode: number; airingAt: number } | null;
	streams: Stream[];
	relations: Related[]; recommendations: Mini[]; characters: Character[];
}
