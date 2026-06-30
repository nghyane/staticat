import { loadFeed, loadPopular, loadSearch } from '$lib/catalog';
import type { PageLoad } from './$types';

// SEO landing: render full HTML at build (overrides the SPA-default layout).
export const ssr = true;
export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const [feed, popular, index] = await Promise.all([loadFeed(0, fetch), loadPopular('day', fetch), loadSearch(fetch).catch(() => [])]);
	const anime = (e: { kind: string }) => e.kind === 'anime';
	return { feed: feed.filter(anime), popular: popular.filter(anime), index: index.filter(anime) };
};
