<script lang="ts">
	import ScheduleRow from '$lib/components/ScheduleRow.svelte';
	import type { PageData } from './$types';
	import type { CatalogEntry } from '$lib/types';

	let { data }: { data: PageData } = $props();

	const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	// Rolling 7-day window from today, bucketed by local date of the next airing.
	const days = $derived.by(() => {
		const scheduled = data.index.filter((e) => e.schedule?.airAt).sort((a, b) => a.schedule!.airAt! - b.schedule!.airAt!);
		const now = new Date();
		const startKey = (d: Date) => d.toDateString();
		const buckets: { label: string; date: string; items: CatalogEntry[] }[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
			buckets.push({ label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WEEKDAY[d.getDay()], date: startKey(d), items: [] });
		}
		const byDate = new Map(buckets.map((b) => [b.date, b]));
		for (const e of scheduled) {
			const key = new Date(e.schedule!.airAt! * 1000).toDateString();
			byDate.get(key)?.items.push(e);
		}
		return buckets.filter((b) => b.items.length > 0);
	});
</script>

<svelte:head>
	<title>Airing calendar — this week | Watchdex</title>
	<meta name="description" content="Weekly anime airing schedule with live countdowns in your local timezone." />
</svelte:head>

<div class="wrap page">
	<header class="head">
		<p class="eyebrow">Schedule</p>
		<h1>Airing this week</h1>
	</header>

	{#if days.length > 0}
		{#each days as day (day.date)}
			<section class="day">
				<h2 class="day-h">{day.label}<span class="n">{day.items.length}</span></h2>
				<div class="rows">{#each day.items as a (a.id)}<ScheduleRow {a} />{/each}</div>
			</section>
		{/each}
	{:else}
		<p class="empty">No scheduled episodes right now — check back when the new season starts.</p>
	{/if}
</div>

<style>
	.page { padding-top: 2.5rem; }
	.head { margin-bottom: 2rem; }
	.head h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; margin-top: 0.4rem; }
	.day { margin-bottom: 2.5rem; }
	.day-h { display: flex; align-items: baseline; gap: 0.6rem; font-family: var(--font-display); font-size: var(--t-lg); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 1rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--line); }
	.day-h .n { font-family: var(--font-mono); font-size: var(--t-xs); color: var(--faint); font-weight: 500; }
	.rows { display: flex; flex-direction: column; }
	.empty { color: var(--muted); padding: 4rem 0; text-align: center; }
</style>
