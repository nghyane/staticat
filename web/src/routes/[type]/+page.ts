import { loadSearch } from '$lib/catalog';
import { isKind } from '$lib/types';
import { error, redirect } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

// SEO browse landings — prerendered at build. anime is included so /anime
// prerenders its redirect to / (omitting it makes the dynamic route 404 since
// prerender=true treats the entry list as exhaustive).
export const ssr = true;
export const prerender = true;
export const entries: EntryGenerator = () =>
	['anime', 'manga', 'movie', 'tv', 'game'].map((type) => ({ type }));

export const load: PageLoad = async ({ fetch, params }) => {
	if (!isKind(params.type)) throw error(404, 'Not found');
	if (params.type === 'anime') throw redirect(307, '/'); // anime home lives at /
	// Data-light prerender: bake only the stable genre nav (SEO skeleton). The
	// card grids are fetched fresh client-side, so data updates need no rebuild.
	const items = (await loadSearch(fetch)).filter((e) => e.kind === params.type);
	const counts = new Map<string, number>();
	for (const e of items) for (const g of e.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
	const genres = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([g]) => g);
	return { kind: params.type, genres };
};
