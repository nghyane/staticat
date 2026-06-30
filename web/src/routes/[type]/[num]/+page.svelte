<script lang="ts">
	import Countdown from '$lib/components/Countdown.svelte';
	import MiniCard from '$lib/components/MiniCard.svelte';
	import { blob, slugifyGenre } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const a = $derived(data.meta);

	const num = (n: number | null) => (n ? n.toLocaleString('en-US') : null);
	const STATUS_LABEL: Record<string, string | null> = { airing: 'Airing', finished: 'Finished', upcoming: 'Upcoming', cancelled: 'Cancelled', unknown: null };
	const statusLabel = $derived(a.kind === 'manga' && a.status === 'airing' ? 'Publishing' : (STATUS_LABEL[a.status] ?? null));
	const backHref = $derived(a.kind === 'anime' ? '/' : `/${a.kind}`);
	const backLabel = $derived(a.kind === 'anime' ? 'Schedule' : 'Browse');

	const rows = $derived.by((): { detailRows: [string, string][]; metaItems: string[] } => {
		const d = a.details;
		let detailRows: [string, string | null][];
		let metaItems: (string | null)[];
		if (d.kind === 'anime') {
			detailRows = [
				['Format', d.format], ['Episodes', d.episodes ? String(d.episodes) : null],
				['Duration', d.duration ? `${d.duration} min` : null],
				['Status', statusLabel], ['Aired', d.aired],
				['Season', d.season && a.year ? `${d.season} ${a.year}` : null],
				['Source', d.source], ['Studio', d.studio],
				['Rating', a.rating ? `${a.rating}%` : null]
			];
			metaItems = [d.format, d.episodes ? `${d.episodes} eps` : null, d.aired, d.studio];
		} else if (d.kind === 'manga') {
			detailRows = [
				['Type', d.format], ['Chapters', d.chapters ? String(d.chapters) : null], ['Volumes', d.volumes ? String(d.volumes) : null],
				['Status', statusLabel], ['Published', d.published],
				['Author', d.authors[0] ?? null], ['Serialization', d.serialization],
				['Rating', a.rating ? `${a.rating}%` : null]
			];
			metaItems = [d.format, d.chapters ? `${d.chapters} ch` : null, d.published, d.authors[0] ?? null];
		} else if (d.kind === 'movie') {
			detailRows = [['Runtime', d.runtime ? `${d.runtime} min` : null], ['Status', statusLabel], ['Director', d.director], ['Rating', a.rating ? `${a.rating}%` : null]];
			metaItems = [d.runtime ? `${d.runtime} min` : null, a.year ? String(a.year) : null, d.director];
		} else if (d.kind === 'game') {
			detailRows = [['Platforms', d.platforms.join(', ') || null], ['Status', statusLabel], ['Developer', d.developer], ['Rating', a.rating ? `${a.rating}%` : null]];
			metaItems = [d.platforms[0] ?? null, a.year ? String(a.year) : null, d.developer];
		} else {
			detailRows = [['Status', statusLabel], ['Rating', a.rating ? `${a.rating}%` : null]];
			metaItems = [a.year ? String(a.year) : null];
		}
		return { detailRows: detailRows.filter(([, v]) => v) as [string, string][], metaItems: metaItems.filter(Boolean) as string[] };
	});
	const detailRows = $derived(rows.detailRows);
	const metaItems = $derived(rows.metaItems);

	const SCHEMA_TYPE: Record<string, string> = { anime: 'TVSeries', tv: 'TVSeries', manga: 'Book', movie: 'Movie', game: 'VideoGame' };
	const jsonLd = $derived({
		'@context': 'https://schema.org', '@type': SCHEMA_TYPE[a.kind] ?? 'CreativeWork', name: a.title,
		...(a.alt[0] ? { alternateName: a.alt[0] } : {}),
		...(a.desc ? { description: a.desc.slice(0, 280) } : {}),
		...(a.cover ? { image: blob(a.cover) } : {}),
		...(a.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: (a.rating / 10).toFixed(1), bestRating: 10, ratingCount: 1 } } : {}),
		genre: a.genres
	});
	const alt = $derived([...a.alt.slice(0, 1), a.native].filter((x) => x && x !== a.title).join('  ·  '));
	const watchLabel = $derived(a.kind === 'game' ? 'Where to play' : a.kind === 'manga' ? 'Where to read' : 'Where to watch');
</script>

<svelte:head>
	<title>{a.title} — where to watch & next release | Watchdex</title>
	<meta name="description" content={a.desc?.slice(0, 155) ?? `When ${a.title} releases next and where to watch it.`} />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
</svelte:head>

<section class="hero">
	{#if a.banner}
		<div class="banner">
			<img src={blob(a.banner)} alt="" width="1280" height="320" fetchpriority="high" />
			<div class="banner-bar"><div class="wrap"><a class="back over" href={backHref}>&larr; {backLabel}</a></div></div>
		</div>
	{:else}
		<div class="wrap topbar"><a class="back" href={backHref}>&larr; {backLabel}</a></div>
	{/if}
	<div class="wrap hero-in" class:pull={a.banner}>
		<div class="poster"><img src={blob(a.cover)} alt={a.title} width="220" height="311" /></div>
		<div class="head">
			<h1 class="h1">{a.title}</h1>
			{#if alt}<p class="alt">{alt}</p>{/if}
			<p class="metaline">
				{#if a.rating}<span class="score" class:hi={a.rating >= 75}>{a.rating}%</span>{/if}
				{#each metaItems as m}<span class="m">{m}</span>{/each}
			</p>
			<div class="chips">
				{#each a.genres as g}<a class="chip chip-accent" href={`/genre/${slugifyGenre(g)}`}>{g}</a>{/each}
				{#each a.tags.slice(0, 4) as t}<span class="chip">{t}</span>{/each}
			</div>
		</div>
	</div>
</section>

<div class="wrap body">
	<main class="content">
		{#if a.schedule?.airAt}
			<div class="next-card">
				<span class="eyebrow">Coming up</span>
				<p class="next-line"><span class="ep mono">EP {a.schedule.nextEp}</span> <span class="in">in</span> <Countdown airAt={a.schedule.airAt} class="big" /></p>
			</div>
		{/if}

		{#if a.desc}
			<section class="sec"><h2 class="sec-h">Synopsis</h2><p class="desc">{a.desc}</p></section>
		{/if}

		{#if a.characters.length > 0}
			<section class="sec">
				<h2 class="sec-h">Characters &amp; cast</h2>
				<div class="chars">
					{#each a.characters as c}
						<div class="char">
							<span class="cside"><img class="cim" src={blob(c.image)} alt="" loading="lazy" width="36" height="50" /><span class="cinfo"><span class="cname">{c.name}</span><span class="crole">{c.role}</span></span></span>
							{#if c.va}<span class="vside"><span class="vname">{c.va}</span>{#if c.vaImage}<img class="vim" src={blob(c.vaImage)} alt="" loading="lazy" width="36" height="50" />{/if}</span>{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if data.related.length > 0}
			<section class="sec"><h2 class="sec-h">Related</h2><div class="mini-grid">{#each data.related as m (m.id)}<MiniCard {m} />{/each}</div></section>
		{/if}

		{#if data.recommendations.length > 0}
			<section class="sec"><h2 class="sec-h">You might also like</h2><div class="mini-grid">{#each data.recommendations as m (m.id)}<MiniCard {m} />{/each}</div></section>
		{/if}
	</main>

	<aside class="side">
		<section class="panel">
			<span class="eyebrow">Details</span>
			<dl class="dl">{#each detailRows as [k, v]}<div class="dl-row"><dt>{k}</dt><dd>{v}</dd></div>{/each}</dl>
		</section>
		<section class="panel">
			<span class="eyebrow">{watchLabel}</span>
			{#if a.availability.length > 0}
				<div class="watch">{#each a.availability as s}<a class="prov" href={s.url} rel="nofollow noopener" target="_blank">{s.provider} &rarr;</a>{/each}</div>
			{:else}
				<p class="nostream">No links yet.</p>
			{/if}
		</section>
	</aside>
</div>

<style>
	.hero { padding-bottom: 2.5rem; }
	.banner { position: relative; height: 300px; overflow: hidden; }
	.banner img { width: 100%; height: 100%; object-fit: cover; }
	.banner::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to bottom, transparent 45%, var(--bg) 98%); }
	.banner-bar { position: absolute; top: 1rem; inset-inline: 0; z-index: 2; }
	.topbar { padding-top: 1.25rem; }
	.back { display: inline-block; color: var(--muted); font-size: var(--t-sm); }
	.back:hover { color: var(--accent); }
	.back.over { color: #fff; background: rgba(15,18,25,.42); backdrop-filter: blur(8px); padding: 0.4rem 0.85rem; border-radius: 999px; }
	.back.over:hover { background: rgba(15,18,25,.62); color: #fff; }
	.hero-in { display: flex; gap: 2.25rem; align-items: flex-end; }
	.hero-in:not(.pull) { margin-top: 1.5rem; }
	.hero-in.pull { margin-top: -130px; position: relative; z-index: 1; }
	.poster { width: 11rem; flex: none; aspect-ratio: 23/32; border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow); }
	.poster img { width: 100%; height: 100%; object-fit: cover; }
	.head { min-width: 0; padding-bottom: 0.4rem; }
	.h1 { font-family: var(--font-display); font-size: var(--t-2xl); font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
	.alt { color: var(--muted); margin-top: 0.45rem; font-size: var(--t-sm); }
	.metaline { display: flex; align-items: center; flex-wrap: wrap; gap: 0.55rem; margin-top: 0.9rem; font-size: var(--t-sm); color: var(--muted); }
	.m + .m::before, .score + .m::before { content: '·'; color: var(--faint); margin-right: 0.55rem; }
	.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.85rem; }

	.body { display: grid; grid-template-columns: 1fr 16rem; gap: 2.75rem; align-items: start; }
	.next-card { background: var(--accent-soft); border-radius: var(--r); padding: 1.1rem 1.3rem; margin-bottom: 2.25rem; }
	.next-line { display: flex; align-items: baseline; gap: 0.55rem; margin-top: 0.5rem; font-size: var(--t-lg); }
	.next-line .ep { font-weight: 700; }
	.next-line .in { color: var(--muted); font-size: var(--t-md); }
	.next-line :global(.cd-num.big) { color: var(--accent); font-weight: 700; min-width: 6ch; }

	.sec { margin-bottom: 2.5rem; }
	.sec-h { font-family: var(--font-display); font-size: var(--t-md); font-weight: 700; letter-spacing: -0.01em; margin-bottom: 1.1rem; }
	.desc { color: var(--muted); line-height: 1.8; max-width: 70ch; }

	.chars { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
	.char { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--bg-soft); border-radius: var(--r-sm); padding: 0.5rem 0.6rem; overflow: hidden; }
	.cside, .vside { display: flex; align-items: center; gap: 0.55rem; min-width: 0; flex: 1; }
	.vside { flex-direction: row-reverse; text-align: right; }
	.vside:empty { display: none; }
	.cim, .vim { width: 2.1rem; height: 2.9rem; border-radius: 5px; object-fit: cover; flex: none; }
	.cinfo { display: flex; flex-direction: column; min-width: 0; }
	.cname, .vname { font-size: var(--t-xs); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.crole { font-size: 0.66rem; color: var(--faint); }

	.mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(94px, 1fr)); gap: 1.1rem 0.85rem; }

	.side { display: flex; flex-direction: column; gap: 1.75rem; position: sticky; top: 5.25rem; }
	.panel .eyebrow { display: block; margin-bottom: 0.8rem; }
	.dl-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.48rem 0; border-bottom: 1px solid var(--line); font-size: var(--t-sm); }
	.dl-row:last-child { border-bottom: 0; }
	.dl-row dt { color: var(--muted); }
	.dl-row dd { font-weight: 500; text-align: right; }
	.watch { display: flex; flex-direction: column; gap: 0.45rem; }
	.prov { background: var(--bg-soft); border-radius: var(--r-sm); padding: 0.55rem 0.85rem; font-size: var(--t-sm); font-weight: 500; transition: background .15s, color .15s; }
	.prov:hover { background: var(--accent-soft); color: var(--accent); }
	.nostream { color: var(--faint); font-size: var(--t-sm); }

	@media (max-width: 820px) {
		.body { grid-template-columns: 1fr; gap: 2rem; }
		.side { position: static; flex-direction: row; flex-wrap: wrap; }
		.side .panel { flex: 1; min-width: 13rem; }
	}
	@media (max-width: 560px) {
		.banner { height: 190px; }
		.hero-in.pull { margin-top: -80px; }
		.hero-in { gap: 1.1rem; }
		.poster { width: 6.5rem; }
		.h1 { font-size: var(--t-xl); }
		.chars { grid-template-columns: 1fr; }
	}
</style>
