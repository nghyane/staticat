// Genre derivation helpers — the "count occurrences, sort, take top N" and
// "unique slug -> display name" logic was copy-pasted across the home/[type]/
// genre loads plus the sitemap and llms.txt endpoints.
import { slugifyGenre, type CatalogEntry } from './types';

/** Most common genres in a set, most-frequent first. */
export const topGenres = (items: CatalogEntry[], n = 10): string[] => {
	const counts = new Map<string, number>();
	for (const e of items) for (const g of e.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => g);
};

/** Unique genre slug -> display name (first seen), for hubs/sitemap/llms.txt. */
export const genreNames = (items: CatalogEntry[]): Map<string, string> => {
	const names = new Map<string, string>();
	for (const e of items) for (const g of e.genres) {
		const slug = slugifyGenre(g);
		if (!names.has(slug)) names.set(slug, g);
	}
	return names;
};
