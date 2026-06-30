<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import ScheduleRow from '$lib/components/ScheduleRow.svelte';
	import MediaCard from '$lib/components/MediaCard.svelte';
	import { airingNext } from '$lib/catalog';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const all = data.all;
	const airing = airingNext(all);
	const upNext = airing.slice(0, 8);
	const trending = all.slice(0, 18);
	const featured = all.find((a) => a.nextEp) ?? all[0];

	const counts = new Map<string, number>();
	for (const a of airing) if (a.season && a.year) counts.set(`${a.season} ${a.year}`, (counts.get(`${a.season} ${a.year}`) ?? 0) + 1);
	const seasonLabel = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'This season';
</script>

<svelte:head>
	<title>Watchdex — anime airing schedule & where to watch</title>
	<meta name="description" content="When the next episode airs and where to watch it. Updated every day." />
</svelte:head>

{#if featured}
	<Hero {featured} season={seasonLabel} count={airing.length} />
{/if}

<div class="wrap">
	{#if upNext.length > 0}
		<section class="block">
			<header class="section-h"><h2>Airing next</h2><a href="/">Full schedule &rarr;</a></header>
			<div class="rows">{#each upNext as a (a.id)}<ScheduleRow {a} />{/each}</div>
		</section>
	{/if}

	{#if trending.length > 0}
		<section class="block">
			<header class="section-h"><h2>Trending this season</h2></header>
			<div class="grid">{#each trending as a (a.id)}<MediaCard {a} />{/each}</div>
		</section>
	{/if}
</div>

<style>
	.block { margin-top: 3.5rem; }
	.rows { display: flex; flex-direction: column; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } }
</style>
