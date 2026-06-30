<script lang="ts">
	// Renders an absolute airing timestamp; the live tick + formatting is driven
	// by one shared interval in +layout.svelte (queries [data-airat]). Reserving
	// width keeps CLS at zero. Runtime classes (.soon/.on) are global.
	let { airAt, class: cls = '' }: { airAt: number; class?: string } = $props();
</script>

<span class="cd-num mono {cls}" data-airat={airAt} aria-label="time until next episode">&nbsp;</span>

<style>
	.cd-num { color: var(--muted); font-variant-numeric: tabular-nums; display: inline-block; min-width: 5.5ch; text-align: right; }
	:global(.cd-num.soon) { color: var(--ink); font-weight: 700; }
	:global(.cd-num.on) { color: var(--live); font-weight: 700; }
</style>
