// Frontend reads ONLY the contract (data/v1/*.json) — produced by the ingest
// job (ingest/build-data.mjs) from AniList and, in prod, written to R2 by cron.
// No third-party API dependency on the read path: if the source dies, the
// committed/ingested snapshot still builds and serves.
import airing from '../data/v1/airing.json';

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

const list = airing as unknown as Anime[];

export function getAnime(): Anime[] { return list; }
export function getOne(slug: string): Anime | undefined { return list.find((a) => a.slug === slug); }

/** Currently airing, soonest next episode first. */
export function airingNext(): Anime[] {
  return list.filter((a) => a.nextEp).sort((a, b) => a.nextEp!.airingAt - b.nextEp!.airingAt);
}
