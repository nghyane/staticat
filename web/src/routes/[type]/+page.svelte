<script lang="ts">
	import BrowseGrid from '$lib/components/BrowseGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const label = $derived(data.kind[0].toUpperCase() + data.kind.slice(1));
</script>

<svelte:head>
	<title>{label} — browse | Watchdex</title>
	<meta name="description" content={`Browse popular ${data.kind} with scores, genres and where to watch.`} />
</svelte:head>

{#if data.items.length > 0}
	<BrowseGrid eyebrow="Browse" title={`Popular ${data.kind}`} items={data.items} />
{:else}
	<div class="wrap empty">
		<p class="eyebrow">{label}</p>
		<h1>{label} are coming soon</h1>
		<p class="sub">Release dates, scores and where to watch &mdash; landing here next.</p>
		<a class="back" href="/">&larr; Browse anime</a>
	</div>
{/if}

<style>
	.empty { padding-block: 6rem 8rem; max-width: 36rem; }
	.empty h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; margin-top: 0.6rem; }
	.empty .sub { color: var(--muted); margin-top: 0.85rem; font-size: var(--t-md); }
	.empty .back { display: inline-block; margin-top: 1.75rem; color: var(--accent); font-size: var(--t-sm); font-weight: 500; }
</style>
