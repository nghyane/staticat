import { loadSearch } from '$lib/catalog';
import type { PageLoad } from './$types';

// Load the full CatalogEntry[] once; all search/filter is client-side (spec:
// catalog nhỏ → tải hết, lọc in-memory).
export const load: PageLoad = async ({ fetch }) => ({ index: await loadSearch(fetch) });
