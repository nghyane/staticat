<script lang="ts">
	import Hero from './Hero.svelte';
	import ScheduleRow from './ScheduleRow.svelte';
	import MediaCard from './MediaCard.svelte';
	import { slugifyGenre, type CatalogEntry, type Kind } from '$lib/types';

	let { kind, feed, popular, index = [] }: { kind: Kind; feed: CatalogEntry[]; popular: CatalogEntry[]; index?: CatalogEntry[] } = $props();
	const featured = $derived(feed.find((e) => e.schedule?.airAt) ?? feed[0] ?? null);
	const upNext = $derived(feed.slice(0, 8));
	const trending = $derived(popular.slice(0, 18));
	const label = $derived(kind[0].toUpperCase() + kind.slice(1));

	// internal linking: genre nav + per-genre rows + top rated (from the catalog)
	const byRating = $derived([...index].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
	const topGenres = $derived.by(() => {
		const m = new Map<string, number>();
		for (const e of index) for (const g of e.genres) m.set(g, (m.get(g) ?? 0) + 1);
		return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([g]) => g);
	});
	const genreRows = $derived(topGenres.slice(0, 4).map((g) => ({ g, list: byRating.filter((e) => e.genres.includes(g)).slice(0, 12) })).filter((r) => r.list.length >= 4));
</script>

{#if featured}
	<Hero {featured} count={feed.length} />

	<div class="wrap">
		{#if topGenres.length > 0}
			<nav class="genres" aria-label="Browse anime genres">
				{#each topGenres as g}<a class="chip" href={`/genre/${slugifyGenre(g)}`}>{g}</a>{/each}
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
{:else}
	<div class="wrap empty">
		<p class="eyebrow">{label}</p>
		<h1>{label} are coming soon</h1>
		<p class="sub">Release dates, scores and where to watch &mdash; landing here next.</p>
		<a class="back" href="/">&larr; Browse anime</a>
	</div>
{/if}

<style>
	.genres { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1rem; }
	.block { margin-top: 3.5rem; }
	.rows { display: flex; flex-direction: column; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } }

	.empty { padding-block: 6rem 8rem; max-width: 36rem; }
	.empty h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; margin-top: 0.6rem; }
	.empty .sub { color: var(--muted); margin-top: 0.85rem; font-size: var(--t-md); }
	.empty .back { display: inline-block; margin-top: 1.75rem; color: var(--accent); font-size: var(--t-sm); font-weight: 500; }
</style>
