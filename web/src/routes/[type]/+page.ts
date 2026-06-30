import { loadSearch } from '$lib/catalog';
import { isKind } from '$lib/types';
import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	if (!isKind(params.type)) throw error(404, 'Not found');
	if (params.type === 'anime') throw redirect(307, '/'); // anime home lives at /
	const items = (await loadSearch(fetch))
		.filter((e) => e.kind === params.type)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
		.slice(0, 60);
	return { kind: params.type, items };
};
