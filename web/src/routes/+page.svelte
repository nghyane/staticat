<script lang="ts">
	import HomeView from '$lib/components/HomeView.svelte';
	import { SITE } from '$lib/site';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const title = 'Watchdex — anime airing schedule & where to watch';
	const desc = 'When the next episode airs and where to watch it. Updated every day.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={`${SITE}/`} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={`${SITE}/`} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={desc} />
</svelte:head>

<HomeView kind="anime" feed={data.feed} popular={data.popular} index={data.index} />
