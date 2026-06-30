import { loadEntity, loadSearch, resolve } from '$lib/catalog';
import { isKind } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	if (!isKind(params.type)) throw error(404, 'Not found');
	const id = `${params.type}:${params.num}`;
	const meta = await loadEntity(id, fetch).catch(() => null);
	if (!meta) throw error(404, 'Not found');
	const index = await loadSearch(fetch).catch(() => []);
	return {
		meta,
		related: resolve(index, meta.valueAdd.related),
		recommendations: resolve(index, meta.valueAdd.recommendations)
	};
};
