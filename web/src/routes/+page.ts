import { loadSearch } from '$lib/catalog';
import { topGenres } from '$lib/genres';
import type { PageLoad } from './$types';

// SEO landing: render full HTML at build (overrides the SPA-default layout).
export const ssr = true;
export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	// Data-light prerender: bake only the stable genre nav (SEO skeleton). The
	// hero + card grids are fetched fresh client-side, so updates need no rebuild.
	const index = (await loadSearch(fetch).catch(() => [])).filter((e) => e.kind === 'anime');
	return { genres: topGenres(index) };
};
