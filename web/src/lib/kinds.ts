// Single source of truth for per-kind presentation: display label, prose noun
// (for cross-kind sentences), and the SEO landing copy. Previously duplicated
// across BrowseLanding, the [type]/genre routes and HomeView.
import type { Kind } from './types';

/** Title-case label for tabs/headings ('TV', not 'Tv'). */
export const KIND_LABEL: Record<Kind, string> = {
	anime: 'Anime',
	manga: 'Manga',
	movie: 'Movies',
	tv: 'TV',
	game: 'Games'
};

/** Lowercase noun for inline prose ('best Action movies and TV series'). */
export const KIND_NOUN: Record<Kind, string> = {
	anime: 'anime',
	manga: 'manga',
	movie: 'movies',
	tv: 'TV series',
	game: 'games'
};

/** Per-kind landing copy — distinct keywords/intent (anti-thin-content, SEO). */
export const KIND_COPY: Record<Kind, { eyebrow: string; h1: string; intro: string }> = {
	anime: { eyebrow: 'Anime', h1: 'Anime — airing schedule & where to watch', intro: 'Top-rated anime by genre, with live episode countdowns, scores and streaming.' },
	manga: { eyebrow: 'Manga', h1: 'Manga — top series & where to read', intro: 'Browse manga by genre — chapters, volumes, authors and publication status, ranked by score.' },
	movie: { eyebrow: 'Movies', h1: 'Movies — top-rated films & where to watch', intro: 'Browse films by genre with IMDb ratings, runtime, cast and director.' },
	tv: { eyebrow: 'TV', h1: 'TV series — top shows & where to watch', intro: 'Browse series by genre with ratings, seasons and cast.' },
	game: { eyebrow: 'Games', h1: 'Games — top PC titles & where to buy', intro: 'Browse games by genre — Metacritic scores, platforms, screenshots and Steam links.' }
};
