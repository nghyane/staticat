<script lang="ts">
	import MediaCard from './MediaCard.svelte';
	import type { CatalogEntry } from '$lib/types';
	// `count` lets a caller show a known total (e.g. baked at prerender) while the
	// grid itself hydrates client-side; defaults to the rendered item count.
	let { eyebrow, title, items, count }: { eyebrow: string; title: string; items: CatalogEntry[]; count?: number } = $props();
	const total = $derived(count ?? items.length);
</script>

<div class="wrap page">
	<header class="head">
		<p class="eyebrow">{eyebrow}</p>
		<h1>{title}</h1>
		<p class="count">{total} title{total === 1 ? '' : 's'}</p>
	</header>
	<div class="card-grid">{#each items as a (a.id)}<MediaCard {a} />{/each}</div>
</div>

<style>
	.page { padding-top: 2.5rem; }
	.head { margin-bottom: 2rem; }
	.head h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; margin-top: 0.4rem; }
	.head .count { color: var(--faint); font-size: var(--t-sm); margin-top: 0.5rem; }
</style>
