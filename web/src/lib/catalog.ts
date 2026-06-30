// Read path: fetch the contract from R2 (served at /v1/* via CDN; in dev from
// static/). Cached per session. If the source dies, the last published
// snapshot keeps serving — no live API dependency.
import type { Anime } from './types';

let cache: Anime[] | null = null;

export async function loadCatalog(f: typeof fetch = fetch): Promise<Anime[]> {
	if (cache) return cache;
	const res = await f('/v1/airing.json');
	if (!res.ok) throw new Error(`catalog unavailable (${res.status})`);
	cache = (await res.json()) as Anime[];
	return cache;
}

/** Currently airing, soonest next episode first. */
export const airingNext = (list: Anime[]): Anime[] =>
	list.filter((a) => a.nextEp).sort((a, b) => a.nextEp!.airingAt - b.nextEp!.airingAt);

export const getOne = (list: Anime[], slug: string): Anime | undefined =>
	list.find((a) => a.slug === slug);
