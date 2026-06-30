// Read path: fetch the contract from R2 (served at /v1/* via CDN; in dev from
// static/). Per-vertical, cached per session. Mirrors contract/discovery.ts.
import type { Home, Entity, Kind } from './types';

const homeCache = new Map<Kind, Home>();

export async function loadHome(kind: Kind, f: typeof fetch = fetch): Promise<Home> {
	const hit = homeCache.get(kind);
	if (hit) return hit;
	const res = await f(`/v1/${kind}/home.json`);
	if (!res.ok) throw new Error(`home ${kind} unavailable (${res.status})`);
	const home = (await res.json()) as Home;
	homeCache.set(kind, home);
	return home;
}

export async function loadEntity(kind: Kind, id: string, f: typeof fetch = fetch): Promise<Entity> {
	const res = await f(`/v1/${kind}/entity/${id}.json`);
	if (!res.ok) throw new Error(`entity ${kind}/${id} unavailable (${res.status})`);
	return (await res.json()) as Entity;
}

/** id = slug tail (id has no '-'). Lets a cold deep-link fetch the entity
 *  without loading the catalog first. */
export const idFromSlug = (slug: string): string => slug.slice(slug.lastIndexOf('-') + 1);
