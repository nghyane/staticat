import { loadHome } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const home = await loadHome('anime', fetch);
	return { home };
};
