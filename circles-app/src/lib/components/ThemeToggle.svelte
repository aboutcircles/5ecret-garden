<script lang="ts">
	import { themeState, themeControls } from '$lib/stores/theme.svelte';
	import Lucide from '$lib/icons/Lucide.svelte';
	import { Sun as LSun, Moon as LMoon } from 'lucide';

	let isDark: boolean = $derived(themeState.current === 'circles-dark');

	function handleToggle() {
		themeControls.toggle();
	}
</script>

<button
	type="button"
	class="btn btn-ghost btn-sm btn-circle"
	onclick={handleToggle}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}
		<Lucide icon={LSun} size={20} class="stroke-current" />
	{:else}
		<Lucide icon={LMoon} size={20} class="stroke-current" />
	{/if}
</button>
