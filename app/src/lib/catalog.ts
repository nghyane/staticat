// Frontend reads ONLY the contract (data/v1/*.json) — produced by the ingest
// job (ingest/build-data.mjs) from AniList and, in prod, written to R2 by cron.
// No third-party API dependency on the read path: if the source dies, the
// committed/ingested snapshot still builds and serves.
import airing from '../data/v1/airing.json';

export interface Stream { site: string; url: string }
export interface Anime {
  id: number; idMal: number | null; slug: string;
  title: string; english: string | null; native: string | null;
  description: string | null;
  cover: string; color: string | null; banner: string | null;
  score: number | null;
  format: string | null; episodes: number | null; duration: number | null;
  status: string; season: string | null; year: number | null;
  genres: string[]; studio: string | null;
  nextEp: { episode: number; airingAt: number } | null;
  streams: Stream[];
}

const list = airing as unknown as Anime[];

export function getAnime(): Anime[] { return list; }
export function getOne(slug: string): Anime | undefined { return list.find((a) => a.slug === slug); }

/** Currently airing, soonest next episode first. */
export function airingNext(): Anime[] {
  return list.filter((a) => a.nextEp).sort((a, b) => a.nextEp!.airingAt - b.nextEp!.airingAt);
}
