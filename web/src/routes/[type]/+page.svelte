<script lang="ts">
	import HomeView from '$lib/components/HomeView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const label = $derived(data.home.kind[0].toUpperCase() + data.home.kind.slice(1));
</script>

<svelte:head>
	<title>{label} — schedule & where to watch | Watchdex</title>
	<meta name="description" content={`${label} release dates, scores and where to watch.`} />
</svelte:head>

<HomeView home={data.home} />
