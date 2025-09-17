<script lang="ts">
    import { onMount } from 'svelte';
    import { popupState } from '$lib/stores/popUp';
    import {headerDropdownOpen} from "$lib/stores/headerDropdown";

    type Highlight = 'soft' | 'tint';
    type CollapsedMode = 'dropdown' | 'bar';

    let {
        maxWidthClass = 'max-w-4xl',
        contentWidthClass = maxWidthClass,
        highlight = 'soft' as Highlight,
        usePagePadding = false,

        collapsedMode = 'dropdown' as CollapsedMode,

        collapsedHeightClass = 'h-12 md:h-14',
        collapsedHeight = '3rem',
        collapsedHeightMd = '3.5rem',

        headerTopGapClass = 'mt-4 md:mt-6',
        collapsedTopGapClass = 'mt-3 md:mt-4'
    } = $props();

    let collapsed = $state(false);
    let hasActions = $state(false);
    let collapsedMenuOpen = $state(false);

    let headerSentinel: HTMLDivElement | null = $state(null);
    let actionsHost: HTMLDivElement | null = $state(null);

    function computeHasChildren(node: HTMLElement | null): boolean {
        if (!node) return false;
        for (const el of Array.from(node.children)) {
            if (el.tagName.toLowerCase() !== 'slot') return true;
        }
        return false;
    }

    function updateHasActions() { hasActions = computeHasChildren(actionsHost); }

    function observeActions(node: HTMLElement) {
        const mo = new MutationObserver(updateHasActions);
        mo.observe(node, { childList: true });
        updateHasActions();
        return { destroy() { mo.disconnect(); } };
    }

    onMount(() => {
        if (!headerSentinel) return;
        const io = new IntersectionObserver((entries) => {
            const entry = entries[0];
            collapsed = !(entry && entry.isIntersecting);
        });
        io.observe(headerSentinel);
        return () => io.disconnect();
    });

    const headerPaddingClass = usePagePadding ? '' : 'px-4 md:px-6';
    const contentPaddingClass = usePagePadding ? '' : 'px-4 md:px-6';
    const fixedPaddingClass = usePagePadding ? '' : 'px-4 md:px-6';

    const isPopupOpen: boolean = $derived($popupState.content !== null);

    // Sync flag for other components (BottomNav)
    $effect(() => { headerDropdownOpen.set(collapsedMenuOpen); });

    // Close the tray when popup opens or when header un-collapses
    $effect(() => {
        const mustClose: boolean = isPopupOpen || !collapsed;
        if (mustClose) { collapsedMenuOpen = false; }
    });

    // Render collapsed UI if: dropdown has actions OR bar mode is enabled
    let hasAnyCollapsedUI: boolean = $derived(collapsedMode === 'bar' || hasActions);

    function toggleCollapsedMenu() { collapsedMenuOpen = !collapsedMenuOpen; }
    function onMenuClick(e: MouseEvent) {
        const target = e.target as HTMLElement | null;
        const shouldClose: boolean = !!target?.closest('button, a, [data-close-dropdown]');
        if (shouldClose) { collapsedMenuOpen = false; }
    }
</script>

<svelte:window on:keydown={(e) => {
    const isEscape = e.key === 'Escape';
    if (isEscape && collapsedMenuOpen) { collapsedMenuOpen = false; }
}} />

<header class="w-full">
    <div class="safe-top" aria-hidden="true"></div>

    <div class={`mx-auto ${maxWidthClass} ${headerPaddingClass}`}>
        <div class={`rounded-2xl ${highlight === 'soft'
            ? 'bg-base-100 border shadow-sm'
            : 'bg-base-100 ring-1 ring-base-300'}
            px-5 md:px-6 py-4 md:py-5 ${headerTopGapClass}`}>
            <!-- Always stack title/meta and actions into separate rows -->
            <div class="flex flex-col gap-3">
                <div class="min-w-0">
                    <div class="leading-tight"><slot name="title" /></div>
                    <div class="mt-1 text-sm text-base-content/60"><slot name="meta" /></div>
                </div>

                <div class="flex items-center gap-2 flex-wrap mt-4" bind:this={actionsHost} use:observeActions>
                    <slot name="actions" />
                </div>
            </div>
        </div>
    </div>

    <div class="h-2" bind:this={headerSentinel}></div>
</header>

{#if hasAnyCollapsedUI}
    <!-- Fixed host for the collapsed control -->
    <div class={`fixed top-0 left-1/2 -translate-x-1/2 w-full ${maxWidthClass} z-50 pointer-events-none`}>
        <div class={`${fixedPaddingClass} transition-all duration-200
            ${collapsed && !isPopupOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>

            {#if collapsedMode === 'bar'}
                <div class={`${collapsedTopGapClass} mb-2 relative`}>
                    <button
                            type="button"
                            class={`w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 ${collapsedHeightClass}
                                flex items-center justify-between gap-3 pointer-events-auto`}
                            aria-expanded={collapsedMenuOpen}
                            on:click={toggleCollapsedMenu}
                    >
                        <div class="min-w-0 flex items-center gap-2">
                            <slot name="collapsed-left" />
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg"
                             class={`h-4 w-4 shrink-0 transition-transform ${collapsedMenuOpen ? 'rotate-180' : ''}`}
                             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
                        </svg>
                    </button>

                    {#if collapsedMenuOpen}
                        <!-- The dropdown panel -->
                        <div class="absolute left-0 right-0 mt-2 pointer-events-auto z-50">
                            <div
                                    class="bg-base-100 border shadow-xl rounded-xl p-2"
                                    style={`--collapsed-h:${collapsedHeight}; --collapsed-h-md:${collapsedHeightMd};`}
                                    on:click={onMenuClick}
                            >
                                <slot name="collapsed-menu" />
                            </div>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="mt-3 md:mt-4 mb-3 flex justify-center">
                    <div class="dropdown">
                        <button type="button" class="btn btn-primary btn-md rounded-full shadow-md pointer-events-auto">
                            <slot name="collapsed-label" />
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        <ul class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-30 w-56 p-2 pointer-events-auto">
                            <slot name="actions-collapsed" />
                        </ul>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    {#if collapsedMode === 'bar' && collapsedMenuOpen}
        <!-- Full-viewport backdrop (outside the width-limited host) -->
        <div
                class="fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 pointer-events-auto"
                role="button"
                tabindex="0"
                aria-label="Close menu"
                on:pointerdown={() => (collapsedMenuOpen = false)}
                aria-hidden="true"
        ></div>
    {/if}
{/if}

<section class={`mx-auto ${contentWidthClass} ${contentPaddingClass}`}>
    <slot />
</section>

<style>
    .safe-top { height: env(safe-area-inset-top); }
</style>
