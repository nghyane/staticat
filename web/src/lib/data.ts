// Client data layer over the CDN-as-database contract.
//
// TanStack Query supplies SWR caching, request dedup and background refetch for
// free, so pages declare *what* they need (a query recipe) instead of *how* to
// fetch, cache and store it. This is the piece that replaces the per-page
// onMount + $state + manual-fetch boilerplate. staleTime matches the 2h ingest
// cron: data is served from cache instantly, then refreshed in the background.
import { QueryClient } from '@tanstack/svelte-query';
import { loadFeed, loadPopular, loadSearch } from './catalog';
import { slugifyGenre, type CatalogEntry, type Kind } from './types';

const HOUR = 3_600_000;

export const makeQueryClient = () =>
	new QueryClient({
		defaultOptions: { queries: { staleTime: 2 * HOUR, refetchOnWindowFocus: false } }
	});

// Query recipes — one place per collection, reused across every page.
export const catalogQuery = (kind: Kind) => ({
	queryKey: ['catalog', kind] as const,
	queryFn: async (): Promise<CatalogEntry[]> => (await loadSearch()).filter((e) => e.kind === kind)
});

export const genreQuery = (slug: string) => ({
	queryKey: ['genre', slug] as const,
	queryFn: async (): Promise<CatalogEntry[]> =>
		(await loadSearch())
			.filter((e) => e.genres.some((g) => slugifyGenre(g) === slug))
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
});

export const feedQuery = () => ({
	queryKey: ['feed', 'anime'] as const,
	queryFn: async (): Promise<CatalogEntry[]> => (await loadFeed(0)).filter((e) => e.kind === 'anime')
});

export const popularQuery = () => ({
	queryKey: ['popular', 'anime'] as const,
	queryFn: async (): Promise<CatalogEntry[]> =>
		(await loadPopular('day')).filter((e) => e.kind === 'anime')
});
