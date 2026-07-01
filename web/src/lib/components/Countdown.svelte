<script lang="ts">
	// Live "time until airing", derived from the shared clock (one interval for
	// the whole app). Renders a reserved-width nbsp until hydrated so CLS stays 0.
	import { browser } from '$app/environment';
	import { now } from '$lib/now.svelte';

	let { airAt, class: cls = '' }: { airAt: number; class?: string } = $props();

	const pad = (n: number) => String(n).padStart(2, '0');
	const fmt = (s: number) => {
		if (s <= 0) return 'now';
		const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
		return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(sec)}`;
	};

	const secs = $derived(airAt - now());
	const text = $derived(browser ? fmt(secs) : ' ');
	const state = $derived(secs <= 0 ? 'on' : secs < 3600 ? 'soon' : '');
</script>

<span class="cd-num mono {cls} {state}" aria-label="time until next episode">{text}</span>

<style>
	.cd-num { color: var(--muted); font-variant-numeric: tabular-nums; display: inline-block; min-width: 5.5ch; text-align: right; }
	.cd-num.soon { color: var(--ink); font-weight: 700; }
	.cd-num.on { color: var(--live); font-weight: 700; }
</style>
