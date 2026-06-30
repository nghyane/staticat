import { loadSearch } from '$lib/catalog';
import { slugifyGenre } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

// Genre hubs — prerendered at build. Enumerate every slug from the search index
// so each genre ships as crawlable static HTML.
export const ssr = true;
export const prerender = true;
export const entries: EntryGenerator = async () => {
	const index = await loadSearch();
	const slugs = new Set<string>();
	for (const e of index) for (const g of e.genres) slugs.add(slugifyGenre(g));
	return [...slugs].map((slug) => ({ slug }));
};

export const load: PageLoad = async ({ fetch, params }) => {
	const index = await loadSearch(fetch);
	const match = index.filter((e) => e.genres.some((g) => slugifyGenre(g) === params.slug));
	if (match.length === 0) throw error(404, 'Genre not found');
	const name = match[0].genres.find((g) => slugifyGenre(g) === params.slug) ?? params.slug;
	return { name, items: match.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)) };
};
