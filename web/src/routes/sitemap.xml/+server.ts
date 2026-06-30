import { loadSearch } from '$lib/catalog';
import { numOf, slugifyGenre } from '$lib/types';
import { SITE } from '$lib/site';
import type { RequestHandler } from './$types';

// Prerendered at build. Lists every URL (home, browse landings, genre hubs, and
// every entity) so crawlers discover the long-tail detail pages even though
// those stay client-rendered.
export const prerender = true;

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: RequestHandler = async () => {
	const index = await loadSearch();
	const genres = new Set<string>();
	for (const e of index) for (const g of e.genres) genres.add(slugifyGenre(g));

	const urls = [
		`${SITE}/`,
		...['manga', 'movie', 'tv', 'game'].map((k) => `${SITE}/${k}`),
		...[...genres].map((s) => `${SITE}/genre/${s}`),
		...index.map((e) => `${SITE}/${e.kind}/${numOf(e.id)}`)
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `\t<url><loc>${xml(u)}</loc></url>`).join('\n')}
</urlset>`;

	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
};
