import { loadSearch } from '$lib/catalog';
import { slugifyGenre } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const index = await loadSearch(fetch);
	const match = index.filter((e) => e.genres.some((g) => slugifyGenre(g) === params.slug));
	if (match.length === 0) throw error(404, 'Genre not found');
	const name = match[0].genres.find((g) => slugifyGenre(g) === params.slug) ?? params.slug;
	return { name, items: match.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)) };
};
