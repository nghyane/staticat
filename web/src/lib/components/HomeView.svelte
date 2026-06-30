<script lang="ts">
	import Hero from './Hero.svelte';
	import ScheduleRow from './ScheduleRow.svelte';
	import MediaCard from './MediaCard.svelte';
	import type { Home } from '$lib/types';

	let { home }: { home: Home } = $props();
	const upNext = $derived(home.airing.slice(0, 8));
	const label = $derived(home.kind[0].toUpperCase() + home.kind.slice(1));
</script>

{#if home.featured}
	<Hero featured={home.featured} season={home.season} count={home.airingCount} />

	<div class="wrap">
		{#if upNext.length > 0}
			<section class="block">
				<header class="section-h"><h2>Airing next</h2><a href="/{home.kind === 'anime' ? '' : home.kind}">Full schedule &rarr;</a></header>
				<div class="rows">{#each upNext as a (a.id)}<ScheduleRow {a} />{/each}</div>
			</section>
		{/if}

		{#if home.trending.length > 0}
			<section class="block">
				<header class="section-h"><h2>Trending this season</h2></header>
				<div class="grid">{#each home.trending as a (a.id)}<MediaCard {a} />{/each}</div>
			</section>
		{/if}
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
	.block { margin-top: 3.5rem; }
	.rows { display: flex; flex-direction: column; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } }

	.empty { padding-block: 6rem 8rem; max-width: 36rem; }
	.empty h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; margin-top: 0.6rem; }
	.empty .sub { color: var(--muted); margin-top: 0.85rem; font-size: var(--t-md); }
	.empty .back { display: inline-block; margin-top: 1.75rem; color: var(--accent); font-size: var(--t-sm); font-weight: 500; }
</style>
