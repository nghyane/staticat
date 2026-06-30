import { loadCatalog } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const all = await loadCatalog(fetch);
	return { all };
};
