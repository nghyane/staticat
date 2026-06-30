import { loadSearch } from '$lib/catalog';
import type { PageLoad } from './$types';

// SEO landing: render full HTML at build (overrides the SPA-default layout).
export const ssr = true;
export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	// Data-light prerender: bake only the stable genre nav (SEO skeleton). The
	// hero + card grids are fetched fresh client-side, so updates need no rebuild.
	const index = (await loadSearch(fetch).catch(() => [])).filter((e) => e.kind === 'anime');
	const counts = new Map<string, number>();
	for (const e of index) for (const g of e.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
	const genres = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([g]) => g);
	return { genres };
};
