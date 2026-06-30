import { loadFeed, loadPopular } from '$lib/catalog';
import { isKind } from '$lib/types';
import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	if (!isKind(params.type)) throw error(404, 'Not found');
	if (params.type === 'anime') throw redirect(307, '/'); // anime home lives at /
	// Single global feed; filter by kind. movie/game have no data yet → empty.
	const [feed, popular] = await Promise.all([loadFeed(0, fetch).catch(() => []), loadPopular('day', fetch).catch(() => [])]);
	return {
		kind: params.type,
		feed: feed.filter((e) => e.kind === params.type),
		popular: popular.filter((e) => e.kind === params.type)
	};
};
