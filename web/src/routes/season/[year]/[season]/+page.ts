import { loadSearch } from '$lib/catalog';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const SEASONS = ['winter', 'spring', 'summer', 'fall'];

export const load: PageLoad = async ({ fetch, params }) => {
	const season = params.season.toLowerCase();
	const year = Number(params.year);
	if (!SEASONS.includes(season) || !year) throw error(404, 'Not found');
	const index = await loadSearch(fetch);
	const items = index
		.filter((e) => e.season?.toLowerCase() === season && e.year === year)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
	if (items.length === 0) throw error(404, 'No titles for this season');
	return { label: `${season[0].toUpperCase() + season.slice(1)} ${year}`, items };
};
