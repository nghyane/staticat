import { loadSearch } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({ index: await loadSearch(fetch) });
