import { loadHome } from '$lib/catalog';
import { isKind } from '$lib/types';
import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	if (!isKind(params.type)) throw error(404, 'Not found');
	if (params.type === 'anime') throw redirect(307, '/'); // anime home lives at /
	const home = await loadHome(params.type, fetch);
	return { home };
};
