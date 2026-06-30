import { loadFeed, loadPopular } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [feed, popular] = await Promise.all([loadFeed(0, fetch), loadPopular('day', fetch)]);
	return { feed: feed.filter((e) => e.kind === 'anime'), popular: popular.filter((e) => e.kind === 'anime') };
};
