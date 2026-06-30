// Read path: fetch the contract from R2. In prod the SPA hits the R2 custom
// domain directly (PUBLIC_DATA_BASE) — zero-function, CDN-cached, and data
// updates land with no rebuild. In dev PUBLIC_DATA_BASE is unset → same-origin
// /v1 served from static/. Mirrors contract/discovery.ts.
import { env } from '$env/dynamic/public';
import type { Home, Entity, Kind } from './types';

const BASE = (env.PUBLIC_DATA_BASE ?? '').replace(/\/$/, '');

// Session caches so back/forward and re-visits are instant (on top of CDN SWR
// and hover-preload). Cleared on full reload, which is when fresh data matters.
const homeCache = new Map<Kind, Home>();
const entityCache = new Map<string, Entity>();

export async function loadHome(kind: Kind, f: typeof fetch = fetch): Promise<Home> {
	const hit = homeCache.get(kind);
	if (hit) return hit;
	const res = await f(`${BASE}/v1/${kind}/home.json`);
	if (!res.ok) throw new Error(`home ${kind} unavailable (${res.status})`);
	const home = (await res.json()) as Home;
	homeCache.set(kind, home);
	return home;
}

export async function loadEntity(kind: Kind, id: string, f: typeof fetch = fetch): Promise<Entity> {
	const key = `${kind}/${id}`;
	const hit = entityCache.get(key);
	if (hit) return hit;
	const res = await f(`${BASE}/v1/${kind}/entity/${id}.json`);
	if (!res.ok) throw new Error(`entity ${key} unavailable (${res.status})`);
	const entity = (await res.json()) as Entity;
	entityCache.set(key, entity);
	return entity;
}

/** id = slug tail (id has no '-'). Lets a cold deep-link fetch the entity
 *  without loading the catalog first. */
export const idFromSlug = (slug: string): string => slug.slice(slug.lastIndexOf('-') + 1);
