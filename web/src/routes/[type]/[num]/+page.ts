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
	const related = resolve(index, meta.valueAdd.related);
	const recommendations = resolve(index, meta.valueAdd.recommendations);

	// Same-kind, same-genre picks (internal linking + SEO) — fills the "more
	// like this" slot for sources without relations (movie/game), and augments.
	const seen = new Set([id, ...related.map((e) => e.id), ...recommendations.map((e) => e.id)]);
	const g = new Set(meta.genres);
	const sameGenre = index
		.filter((e) => e.kind === meta.kind && !seen.has(e.id) && e.genres.some((x) => g.has(x)))
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
		.slice(0, 12);

	return { meta, related, recommendations, sameGenre };
};
