<script lang="ts">
	import Countdown from './Countdown.svelte';
	import type { Anime } from '$lib/types';
	let { featured, season, count }: { featured: Anime; season: string; count: number } = $props();
</script>

<section class="hero">
	<div class="wrap hero-in">
		<div class="copy">
			<p class="eyebrow">Now airing &middot; {season}</p>
			<h1 class="h1">When the next episode airs,<br />and where to watch it.</h1>
			<p class="sub">Live countdowns for {count} anime airing this season &mdash; with scores, genres and streaming, in your local timezone.</p>
		</div>

		<a class="feat" href={`/anime/${featured.slug}`}>
			<img src={featured.cover} alt={featured.title} width="280" height="396" loading="eager" decoding="async" />
			<div class="cap">
				<span class="t">{featured.title}</span>
				{#if featured.nextEp}
					<span class="cd"><span class="ep mono">EP {featured.nextEp.episode}</span> &middot; <Countdown airAt={featured.nextEp.airingAt} class="w" /></span>
				{/if}
			</div>
		</a>
	</div>
</section>

<style>
	.hero { padding-block: 3rem 3.5rem; }
	.hero-in { display: flex; align-items: center; justify-content: space-between; gap: 3.5rem; }
	.copy { max-width: 32rem; }
	.h1 { font-family: var(--font-display); font-size: clamp(2rem, 4.4vw, 3rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; margin-top: 0.6rem; }
	.sub { color: var(--muted); margin-top: 1rem; font-size: var(--t-md); max-width: 42ch; }

	.feat { position: relative; width: 15rem; flex: none; aspect-ratio: 23/32; border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow); }
	.feat img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }
	.feat:hover img { transform: scale(1.05); }
	.cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 2rem 1rem 0.95rem; background: linear-gradient(to top, rgba(10,12,18,.9), transparent); color: #fff; }
	.cap .t { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 700; font-size: var(--t-sm); line-height: 1.25; }
	.cap .cd { display: flex; align-items: baseline; gap: 0.35rem; margin-top: 0.3rem; font-size: var(--t-xs); color: rgba(255,255,255,.78); }
	.cap .cd .ep { color: #fff; }
	.cap .cd :global(.cd-num.w) { color: #fff; font-weight: 700; }

	@media (max-width: 760px) { .feat { display: none; } .h1 :global(br) { display: none; } }
</style>
