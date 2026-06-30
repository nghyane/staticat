// Read path: fetch the contract from R2 (PUBLIC_DATA_BASE in prod; same-origin
// /v1 in dev). Mirrors contract/discovery.ts. Session-cached.
import { env } from '$env/dynamic/public';
import type { CatalogEntry, EntityMeta, EntityHead, SearchHead } from './types';

const BASE = (env.PUBLIC_DATA_BASE ?? '').replace(/\/$/, '');
const idPath = (id: string) => id.replace(':', '/');

async function J<T>(f: typeof fetch, path: string): Promise<T> {
	const r = await f(`${BASE}${path}`);
	if (!r.ok) throw new Error(`${path} (${r.status})`);
	return (await r.json()) as T;
}

const listCache = new Map<string, CatalogEntry[]>();
async function list(f: typeof fetch, path: string): Promise<CatalogEntry[]> {
	const hit = listCache.get(path);
	if (hit) return hit;
	const v = await J<CatalogEntry[]>(f, path);
	listCache.set(path, v);
	return v;
}

export const loadFeed = (page = 0, f: typeof fetch = fetch) => list(f, `/v1/feed/latest/${page}.json`);
export const loadPopular = (period: 'day' | 'week' | 'all' = 'day', f: typeof fetch = fetch) => list(f, `/v1/feed/popular/${period}.json`);
export const loadCalendar = (week: string, f: typeof fetch = fetch) => list(f, `/v1/calendar/${week}.json`);

// Entity = head (current rev) → meta.v{rev} (immutable).
const entityCache = new Map<string, EntityMeta>();
export async function loadEntity(id: string, f: typeof fetch = fetch): Promise<EntityMeta> {
	const hit = entityCache.get(id);
	if (hit) return hit;
	const head = await J<EntityHead>(f, `/v1/entity/${idPath(id)}/head.json`);
	const meta = await J<EntityMeta>(f, `/v1/entity/${idPath(id)}/meta.v${head.rev}.json`);
	entityCache.set(id, meta);
	return meta;
}

// Full catalog (CatalogEntry[]) — resolve related ids to cards + name search.
let search: CatalogEntry[] | null = null;
export async function loadSearch(f: typeof fetch = fetch): Promise<CatalogEntry[]> {
	if (search) return search;
	const head = await J<SearchHead>(f, `/v1/search/head.json`);
	search = await J<CatalogEntry[]>(f, `/v1/search/index.v${head.ver}.json`);
	return search;
}

/** Resolve a list of entity ids to CatalogEntry via the search index. */
export function resolve(index: CatalogEntry[], ids: string[]): CatalogEntry[] {
	const by = new Map(index.map((e) => [e.id, e]));
	return ids.map((id) => by.get(id)).filter((e): e is CatalogEntry => !!e);
}
