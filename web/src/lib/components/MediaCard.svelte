<script lang="ts">
	import Countdown from './Countdown.svelte';
	import { blob, numOf, cardMeta, type CatalogEntry } from '$lib/types';

	// One poster card. `mini` = the compact variant used in detail-page rails
	// (smaller, no rating/meta/countdown); `relation` labels a related title.
	let { a, mini = false, relation }: { a: CatalogEntry; mini?: boolean; relation?: string } = $props();
</script>

<a class="card" class:mini href={`/${a.kind}/${numOf(a.id)}`}>
	<div class="poster">
		<img src={blob(a.cover)} alt={a.title} loading="lazy" decoding="async" width={mini ? 92 : 230} height={mini ? 128 : 325} />
		{#if !mini && a.rating}<span class="score badge" class:hi={a.rating >= 75}>{a.rating}</span>{/if}
	</div>
	{#if relation}<span class="rel">{relation}</span>{/if}
	<h3 class="title">{a.title}</h3>
	{#if !mini}
		<p class="meta">{cardMeta(a)}</p>
		{#if a.schedule?.airAt}<p class="next"><span class="ep mono">EP {a.schedule.nextEp}</span> <Countdown airAt={a.schedule.airAt} /></p>{/if}
	{/if}
</a>

<style>
	.card { display: flex; flex-direction: column; gap: 0.55rem; }
	.card.mini { gap: 0.4rem; }
	.poster { position: relative; aspect-ratio: 23/32; border-radius: var(--r); overflow: hidden; background: var(--bg-soft); box-shadow: var(--shadow); transition: transform .2s ease; }
	.card.mini .poster { border-radius: var(--r-sm); }
	.card:hover .poster { transform: translateY(-4px); }
	.card.mini:hover .poster { transform: translateY(-3px); }
	.poster img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
	.card:hover .poster img { transform: scale(1.05); }
	.badge { position: absolute; top: 0.5rem; right: 0.5rem; font-size: 0.7rem; background: rgba(18,20,28,.78); backdrop-filter: blur(3px); }
	.badge.hi { background: rgba(22,179,100,.92); }
	.rel { font-size: 0.64rem; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
	.title { font-size: var(--t-sm); font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.card.mini .title { font-size: var(--t-xs); }
	.card:hover .title { color: var(--accent); }
	.meta { font-size: var(--t-xs); color: var(--faint); }
	.next { font-size: var(--t-xs); color: var(--muted); display: flex; align-items: baseline; gap: 0.4rem; }
	.next .ep { color: var(--ink); font-weight: 600; }
</style>
