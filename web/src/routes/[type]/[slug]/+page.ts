import { loadEntity, idFromSlug } from '$lib/catalog';
import { isKind } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	if (!isKind(params.type)) throw error(404, 'Not found');
	const id = idFromSlug(params.slug);
	const a = await loadEntity(params.type, id, fetch).catch(() => null);
	if (!a) throw error(404, 'Not found');
	return { a };
};
