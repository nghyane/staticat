<script lang="ts">
	import Countdown from './Countdown.svelte';
	import { blob, numOf, cardMeta, type CatalogEntry } from '$lib/types';
	let { a }: { a: CatalogEntry } = $props();
	const soon = $derived(a.schedule?.airAt ? a.schedule.airAt - Date.now() / 1000 < 3600 : false);
	const meta = $derived([cardMeta(a), a.rating ? `${a.rating}%` : null].filter(Boolean).join('  ·  '));
</script>

<a class="row" href={`/${a.kind}/${numOf(a.id)}`}>
	<span class="poster"><img src={blob(a.cover)} alt="" loading="lazy" decoding="async" width="44" height="62" /></span>
	<span class="main">
		<span class="title">{a.title}</span>
		<span class="meta">{meta}</span>
	</span>
	{#if a.schedule?.airAt}
		<span class="cd" class:soon>
			<span class="ep mono">EP {a.schedule.nextEp}</span>
			{#if soon}<span class="dot" aria-hidden="true"></span>{/if}
			<Countdown airAt={a.schedule.airAt} />
		</span>
	{/if}
</a>

<style>
	.row { display: grid; grid-template-columns: 2.75rem 1fr auto; align-items: center; gap: 1rem; padding: 0.65rem 0.75rem; margin-inline: -0.75rem; border-radius: var(--r-sm); transition: background .14s; }
	.row:hover { background: var(--bg-soft); }
	.poster { width: 2.75rem; height: 3.85rem; border-radius: 6px; overflow: hidden; background: var(--bg-soft); }
	.poster img { width: 100%; height: 100%; object-fit: cover; }
	.main { min-width: 0; display: flex; flex-direction: column; gap: 0.18rem; }
	.title { font-weight: 600; font-size: var(--t-md); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.row:hover .title { color: var(--accent); }
	.meta { font-size: var(--t-sm); color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.cd { display: inline-flex; align-items: center; gap: 0.5rem; white-space: nowrap; font-size: var(--t-sm); color: var(--muted); }
	.cd .ep { color: var(--faint); }
	.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--live); box-shadow: 0 0 0 3px color-mix(in srgb, var(--live) 22%, transparent); }
</style>
