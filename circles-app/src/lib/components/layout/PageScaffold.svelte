<script lang="ts">
    import { onMount } from 'svelte';
    import { popupState } from '$lib/stores/popUp';
    import {headerDropdownOpen} from "$lib/stores/headerDropdown";

    /* NEW: bring avatar + profile popup context here so the avatar lives inside the scaffold */
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { popupControls } from '$lib/stores/popUp';
    import ProfilePage from '$lib/pages/Profile.svelte';
    import SettingProfile from "$lib/pages/SettingProfile.svelte";

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

    // Close the tray when popup opens, header un-collapses, or there are no actions
    $effect(() => {
        const mustClose: boolean = isPopupOpen || !collapsed || !hasActions;
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

    /* NEW: minimal avatar state + open behavior */
    const hasAvatar: boolean = $derived(!!avatarState.avatar);
    const avatarImgUrl: string = $derived(
        avatarState.profile?.previewImageUrl?.trim()
            ? avatarState.profile!.previewImageUrl!
            : '/logo.svg'
    );
    const avatarAlt: string = $derived(avatarState.profile?.name ? `${avatarState.profile.name} avatar` : 'Avatar');

    function openProfile() {
        if (!avatarState.avatar) { return; }
        popupControls.open({ title: '', component: SettingProfile, props: { address: avatarState.avatar.address } });
    }
</script>

<svelte:window onkeydown={(e) => {
    const isEscape = e.key === 'Escape';
    if (isEscape && collapsedMenuOpen) { collapsedMenuOpen = false; }
}} />

<header class="w-full">
    <div class="safe-top" aria-hidden="true"></div>

    <div class={`mx-auto ${maxWidthClass} ${headerPaddingClass}`}>
        <div class={`rounded-2xl ${highlight === 'soft'
            ? 'bg-base-100 border shadow-sm'
            : 'bg-base-100 ring-1 ring-base-300'}
            px-5 md:px-6 py-4 md:py-5 ${headerTopGapClass} relative`}><!-- NOTE: relative for absolute avatar -->
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

            <!-- NEW: avatar inside expanded header (top-right of the card) -->
            {#if hasAvatar}
                <button
                        type="button"
                        class="absolute right-4 top-4 md:right-5 md:top-5 rounded-full outline-none ring-0 pointer-events-auto"
                        onclick={openProfile}
                        aria-label="Open profile"
                        title="Open profile"
                >
                    <img
                            src={avatarImgUrl}
                            alt={avatarAlt}
                            class="w-9 h-9 md:w-10 md:h-10 rounded-full border shadow-sm object-cover"
                            loading="eager"
                            decoding="async"
                    />
                </button>
            {/if}
        </div>
    </div>

    <div class="h-2" bind:this={headerSentinel}></div>
</header>

{#if hasAnyCollapsedUI && collapsed}
    <!-- Fixed host for the collapsed control (only rendered when collapsed) -->
    <div class={`fixed top-0 left-1/2 -translate-x-1/2 w-full ${maxWidthClass} z-50 pointer-events-none`}>
        <div class={`${fixedPaddingClass}`}>

            {#if collapsedMode === 'bar'}
                <div class={`${collapsedTopGapClass} mb-2 relative`}><!-- NOTE: relative to anchor avatar -->
                    {#if hasActions}
                        <!-- Entire bar is clickable when actions exist -->
                        <button
                                type="button"
                                class={`w-full bg-base-100 border shadow-sm rounded-xl pl-3 md:pl-4 pr-14 md:pr-16 ${collapsedHeightClass}
                                flex items-center justify-between gap-3 pointer-events-auto cursor-pointer`}
                                aria-expanded={collapsedMenuOpen}
                                aria-label="Toggle quick actions"
                                onclick={toggleCollapsedMenu}
                        >
                            <div class="min-w-0 flex items-center gap-2">
                                <slot name="collapsed-left">
                                    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content truncate">
                                        <slot name="title" />
                                    </span>
                                </slot>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class={`h-4 w-4 shrink-0 transition-transform ${collapsedMenuOpen ? 'rotate-180' : ''}`}
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                    {:else}
                        <!-- Non-interactive bar when there are no actions -->
                        <div
                                class={`w-full bg-base-100 border shadow-sm rounded-xl pl-3 md:pl-4 pr-14 md:pr-16 ${collapsedHeightClass}
                                flex items-center justify-between gap-3 pointer-events-auto cursor-default`}
                                aria-hidden="true"
                        >
                            <div class="min-w-0 flex items-center gap-2">
                                <slot name="collapsed-left">
                                    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content truncate">
                                        <slot name="title" />
                                    </span>
                                </slot>
                            </div>
                        </div>
                    {/if}

                    <!-- NEW: avatar inside collapsed header bar (pinned top-right) -->
                    {#if hasAvatar}
                        <button
                                type="button"
                                class="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 rounded-full pointer-events-auto"
                                onclick={openProfile}
                                aria-label="Open profile"
                                title="Open profile"
                        >
                            <img
                                    src={avatarImgUrl}
                                    alt={avatarAlt}
                                    class="w-8 h-8 md:w-9 md:h-9 rounded-full border shadow-sm object-cover"
                                    loading="eager"
                                    decoding="async"
                            />
                        </button>
                    {/if}

                    {#if collapsedMenuOpen && hasActions}
                        <div class="absolute left-0 right-0 mt-2 pointer-events-auto z-50">
                            <div
                                    class="bg-base-100 border shadow-xl rounded-xl p-2"
                                    style={`--collapsed-h:${collapsedHeight}; --collapsed-h-md:${collapsedHeightMd};`}
                                    onclick={onMenuClick}
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

    {#if collapsedMenuOpen && hasActions}
        <!-- Full-viewport backdrop (outside the width-limited host) -->
        <div
                class="fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 pointer-events-auto"
                role="button"
                tabindex="0"
                aria-label="Close menu"
                onpointerdown={(e) => { e.stopPropagation(); e.preventDefault(); collapsedMenuOpen = false; }}
                onclick={(e) => { e.stopPropagation(); e.preventDefault(); collapsedMenuOpen = false; }}
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
