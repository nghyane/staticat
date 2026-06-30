import { loadSearch } from '$lib/catalog';
import { genreNames } from '$lib/genres';
import { numOf, type CatalogEntry, type Kind } from '$lib/types';
import { SITE } from '$lib/site';
import type { RequestHandler } from './$types';

// Curated index for AI retrieval. Perplexity and Claude honor llms.txt to
// prioritise pages; bulk crawler bots ignore it and read HTML, so this
// complements (doesn't replace) the prerendered pages + sitemap. Prerendered
// at build like sitemap.xml — a slow-changing structural artifact.
export const prerender = true;

const KINDS: { kind: Kind; label: string; blurb: string; href: string }[] = [
	{ kind: 'anime', label: 'Anime', blurb: 'airing schedule & where to watch', href: '/' },
	{ kind: 'manga', label: 'Manga', blurb: 'top series & where to read', href: '/manga' },
	{ kind: 'movie', label: 'Movies', blurb: 'top-rated films & where to watch', href: '/movie' },
	{ kind: 'tv', label: 'TV series', blurb: 'top shows & where to watch', href: '/tv' },
	{ kind: 'game', label: 'Games', blurb: 'top PC titles & where to buy', href: '/game' }
];

export const GET: RequestHandler = async () => {
	const index = await loadSearch();

	// genre slug -> display name, alphabetical
	const genres = [...genreNames(index).entries()].sort((a, b) => a[1].localeCompare(b[1]));

	const line = (e: CatalogEntry) => {
		const meta = [e.year, e.genres.slice(0, 3).join('/'), e.rating != null ? `${e.rating}%` : null]
			.filter(Boolean)
			.join(' · ');
		return `- [${e.title}](${SITE}/${e.kind}/${numOf(e.id)})${meta ? `: ${meta}` : ''}`;
	};
	const top = (kind: Kind, n = 25) =>
		index.filter((e) => e.kind === kind).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, n);

	const parts: string[] = [
		'# Watchdex',
		'',
		'> Discovery catalog for anime, manga, movies, TV series and games — ratings, genres, airing schedules and where to watch, read or buy. Data from MyAnimeList, Steam and Cinemeta, refreshed continuously.',
		'',
		'## Browse',
		...KINDS.map((k) => `- [${k.label}](${SITE}${k.href}): ${k.blurb}`),
		'',
		'## Genres',
		...genres.map(([slug, name]) => `- [${name}](${SITE}/genre/${slug})`)
	];
	for (const k of KINDS) {
		const list = top(k.kind);
		if (list.length) parts.push('', `## Top ${k.label}`, ...list.map(line));
	}

	return new Response(parts.join('\n') + '\n', {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
};
