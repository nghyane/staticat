import { loadFeed, loadPopular, loadSearch } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [feed, popular, index] = await Promise.all([loadFeed(0, fetch), loadPopular('day', fetch), loadSearch(fetch).catch(() => [])]);
	const anime = (e: { kind: string }) => e.kind === 'anime';
	return { feed: feed.filter(anime), popular: popular.filter(anime), index: index.filter(anime) };
};
