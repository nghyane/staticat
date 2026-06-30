<script lang="ts">
	import { blob, numOf, type CatalogEntry } from '$lib/types';
	// Resolved internal card (from the search index). Always internal — refs are
	// pruned at ingest to entities we publish.
	let { m, relation }: { m: CatalogEntry; relation?: string } = $props();
</script>

<a class="mini" href={`/${m.kind}/${numOf(m.id)}`}>
	<div class="cv"><img src={blob(m.cover)} alt="" loading="lazy" decoding="async" width="92" height="128" /></div>
	{#if relation}<span class="rel">{relation}</span>{/if}
	<span class="t">{m.title}</span>
</a>

<style>
	.mini { display: flex; flex-direction: column; gap: 0.4rem; }
	.cv { aspect-ratio: 23/32; border-radius: var(--r-sm); overflow: hidden; background: var(--bg-soft); box-shadow: var(--shadow); transition: transform .2s ease; }
	.mini:hover .cv { transform: translateY(-3px); }
	.cv img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
	.mini:hover .cv img { transform: scale(1.05); }
	.rel { font-size: 0.64rem; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
	.t { font-size: var(--t-xs); font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.mini:hover .t { color: var(--accent); }
</style>
