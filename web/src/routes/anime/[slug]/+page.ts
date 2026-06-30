import { loadCatalog, getOne } from '$lib/catalog';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const all = await loadCatalog(fetch);
	const a = getOne(all, params.slug);
	if (!a) throw error(404, 'Not found');
	const known = new Set(all.map((x) => x.slug));
	return { a, known };
};
