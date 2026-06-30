<script lang="ts">
	import { onMount } from 'svelte';
	import Hero from './Hero.svelte';
	import ScheduleRow from './ScheduleRow.svelte';
	import MediaCard from './MediaCard.svelte';
	import { loadFeed, loadPopular, loadSearch } from '$lib/catalog';
	import { slugifyGenre, type CatalogEntry, type Kind } from '$lib/types';

	// `genres` is the stable SEO skeleton (prerendered nav links). The hero and
	// card grids are volatile, so they're fetched fresh from R2 on the client —
	// the prerendered HTML never bakes them, so updates need no rebuild.
	let { kind, genres }: { kind: Kind; genres: string[] } = $props();
	const label = $derived(kind[0].toUpperCase() + kind.slice(1));

	let feed = $state<CatalogEntry[]>([]);
	let popular = $state<CatalogEntry[]>([]);
	let index = $state<CatalogEntry[]>([]);
	const anime = (e: CatalogEntry) => e.kind === 'anime';
	onMount(async () => {
		const [f, p, i] = await Promise.all([loadFeed(0), loadPopular('day'), loadSearch().catch(() => [])]);
		feed = f.filter(anime);
		popular = p.filter(anime);
		index = i.filter(anime);
	});

	const featured = $derived(feed.find((e) => e.schedule?.airAt) ?? feed[0] ?? null);
	const upNext = $derived(feed.slice(0, 8));
	const trending = $derived(popular.slice(0, 18));

	// per-genre rows + top rated (cards hydrate from the live catalog)
	const byRating = $derived([...index].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
	const genreRows = $derived(genres.slice(0, 4).map((g) => ({ g, list: byRating.filter((e) => e.genres.includes(g)).slice(0, 12) })).filter((r) => r.list.length >= 4));
</script>

{#if featured}
	<Hero {featured} count={feed.length} />
{:else}
	<!-- prerendered skeleton: real h1 + copy before the hero hydrates -->
	<header class="wrap intro">
		<p class="eyebrow">{label}</p>
		<h1>Anime airing schedule &amp; where to watch</h1>
		<p class="sub">Live episode countdowns, scores and streaming &mdash; updated daily.</p>
	</header>
{/if}

<div class="wrap">
	{#if genres.length > 0}
		<nav class="genres" aria-label="Browse anime genres">
			{#each genres as g}<a class="chip" href={`/genre/${slugifyGenre(g)}`}>{g}</a>{/each}
		</nav>
	{/if}

	{#if upNext.length > 0}
		<section class="block">
			<header class="section-h"><h2>Airing next</h2><a href="/calendar">Full schedule &rarr;</a></header>
			<div class="rows">{#each upNext as a (a.id)}<ScheduleRow {a} />{/each}</div>
		</section>
	{/if}

	{#if trending.length > 0}
		<section class="block">
			<header class="section-h"><h2>Trending</h2></header>
			<div class="grid">{#each trending as a (a.id)}<MediaCard {a} />{/each}</div>
		</section>
	{/if}

	{#each genreRows as row (row.g)}
		<section class="block">
			<header class="section-h"><h2>{row.g}</h2><a href={`/genre/${slugifyGenre(row.g)}`}>See all &rarr;</a></header>
			<div class="grid">{#each row.list as a (a.id)}<MediaCard {a} />{/each}</div>
		</section>
	{/each}
</div>

<style>
	.genres { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1rem; }
	.block { margin-top: 3.5rem; }
	.rows { display: flex; flex-direction: column; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } }

	.intro { padding-block: 4rem 0.5rem; max-width: 40rem; }
	.intro h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; margin-top: 0.5rem; line-height: 1.08; }
	.intro .sub { color: var(--muted); margin-top: 0.8rem; font-size: var(--t-md); }
</style>
