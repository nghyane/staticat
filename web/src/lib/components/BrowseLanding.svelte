<script lang="ts">
	import { onMount } from 'svelte';
	import MediaCard from './MediaCard.svelte';
	import { loadSearch } from '$lib/catalog';
	import { slugifyGenre, type CatalogEntry, type Kind } from '$lib/types';
	import { SITE } from '$lib/site';

	// `genres` is the stable SEO skeleton (prerendered nav links). The card
	// grids are volatile, so they're fetched fresh from R2 on the client — the
	// prerendered HTML never bakes them, so data updates need no rebuild.
	let { kind, genres }: { kind: Kind; genres: string[] } = $props();
	const canonical = $derived(`${SITE}/${kind}`);

	let items = $state<CatalogEntry[]>([]);
	onMount(async () => {
		items = (await loadSearch()).filter((e) => e.kind === kind);
	});

	// per-kind copy — distinct keywords/intent (anti-thin-content, SEO)
	const COPY: Record<string, { eyebrow: string; h1: string; intro: string }> = {
		anime: { eyebrow: 'Anime', h1: 'Anime — airing schedule & where to watch', intro: 'Top-rated anime by genre, with live episode countdowns, scores and streaming.' },
		manga: { eyebrow: 'Manga', h1: 'Manga — top series & where to read', intro: 'Browse manga by genre — chapters, volumes, authors and publication status, ranked by score.' },
		movie: { eyebrow: 'Movies', h1: 'Movies — top-rated films & where to watch', intro: 'Browse films by genre with IMDb ratings, runtime, cast and director.' },
		game: { eyebrow: 'Games', h1: 'Games — top PC titles & where to buy', intro: 'Browse games by genre — Metacritic scores, platforms, screenshots and Steam links.' },
		tv: { eyebrow: 'TV', h1: 'TV series — top shows & where to watch', intro: 'Browse series by genre with ratings, seasons and cast.' }
	};
	const c = $derived(COPY[kind] ?? COPY.anime);

	const byRating = $derived([...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
	const genreRows = $derived(
		genres.slice(0, 4).map((g) => ({ g, list: byRating.filter((e) => e.genres.includes(g)).slice(0, 12) })).filter((r) => r.list.length >= 4)
	);
	const recent = $derived([...items].filter((e) => e.year).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 12));

	// structural JSON-LD — no per-item list, so it's complete at prerender time
	const jsonLd = $derived({
		'@context': 'https://schema.org', '@type': 'CollectionPage', name: c.h1, about: c.intro
	});
</script>

<svelte:head>
	<title>{c.h1} | Watchdex</title>
	<meta name="description" content={c.intro} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={`${c.h1} | Watchdex`} />
	<meta property="og:description" content={c.intro} />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
</svelte:head>

<div class="wrap page">
	<header class="head">
		<p class="eyebrow">{c.eyebrow}</p>
		<h1>{c.h1}</h1>
		<p class="intro">{c.intro}</p>
		<nav class="genres" aria-label="Genres">
			{#each genres as g}<a class="chip" href={`/genre/${slugifyGenre(g)}`}>{g}</a>{/each}
		</nav>
	</header>

	{#if byRating.length > 0}
		<section class="block">
			<header class="section-h"><h2>Top rated</h2></header>
			<div class="grid">{#each byRating.slice(0, 18) as a (a.id)}<MediaCard {a} />{/each}</div>
		</section>
	{/if}

	{#each genreRows as row (row.g)}
		<section class="block">
			<header class="section-h"><h2>{row.g}</h2><a href={`/genre/${slugifyGenre(row.g)}`}>See all &rarr;</a></header>
			<div class="grid">{#each row.list as a (a.id)}<MediaCard {a} />{/each}</div>
		</section>
	{/each}

	{#if recent.length >= 4}
		<section class="block">
			<header class="section-h"><h2>Recently released</h2></header>
			<div class="grid">{#each recent as a (a.id)}<MediaCard {a} />{/each}</div>
		</section>
	{/if}
</div>

<style>
	.page { padding-top: 2.5rem; }
	.head { max-width: 46rem; margin-bottom: 1rem; }
	.head h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; margin-top: 0.4rem; }
	.intro { color: var(--muted); margin-top: 0.85rem; font-size: var(--t-md); }
	.genres { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1.25rem; }
	.block { margin-top: 3rem; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } }
</style>
