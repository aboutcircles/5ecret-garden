<script lang="ts">
    import { onMount } from 'svelte';

    type Highlight = 'soft' | 'tint';

    let {
        maxWidthClass = 'max-w-4xl',
        // Content width can differ from header; defaults to header width.
        contentWidthClass = maxWidthClass,
        highlight = 'soft' as Highlight,
        // When true, skip the internal px paddings and rely on external `.page` classes.
        usePagePadding = false
    } = $props();

    let collapsed = $state(false);
    let hasActions = $state(false);

    let headerSentinel: HTMLDivElement | null = $state(null);
    let actionsHost: HTMLDivElement | null = $state(null);

    function computeHasActions(node: HTMLElement | null): boolean {
        if (!node) return false;
        for (const el of Array.from(node.children)) {
            if (el.tagName.toLowerCase() !== 'slot') return true;
        }
        return false;
    }

    function updateHasActions() {
        hasActions = computeHasActions(actionsHost);
    }

    function observeSlot(node: HTMLElement) {
        const mo = new MutationObserver(updateHasActions);
        mo.observe(node, { childList: true });
        updateHasActions();
        return { destroy() { mo.disconnect(); } };
    }

    onMount(() => {
        if (headerSentinel) {
            const io = new IntersectionObserver((entries) => {
                const entry = entries[0];
                collapsed = !(entry && entry.isIntersecting);
            });
            io.observe(headerSentinel);
        }
    });

    const headerPaddingClass = usePagePadding ? '' : 'px-4 md:px-6';
    const contentPaddingClass = usePagePadding ? '' : 'px-4 md:px-6';
    const fixedPaddingClass = usePagePadding ? '' : 'px-4 md:px-6';
</script>

<header class="w-full">
    <div class={`mx-auto ${maxWidthClass} ${headerPaddingClass}`}>
        <div class={`rounded-2xl ${highlight === 'soft'
      ? 'bg-base-100 border shadow-sm'
      : 'bg-base-100 ring-1 ring-base-300'}
      px-5 md:px-6 py-4 md:py-5 mt-1`}>
            <div class="flex items-start md:items-end justify-between gap-4 flex-wrap">
                <div class="min-w-0">
                    <div class="leading-tight">
                        <slot name="title" />
                    </div>
                    <div class="mt-1 text-sm text-base-content/60">
                        <slot name="meta" />
                    </div>
                </div>

                <div
                        class="flex items-center gap-2 flex-wrap"
                        bind:this={actionsHost}
                        use:observeSlot
                >
                    <slot name="actions" />
                </div>
            </div>
        </div>
    </div>

    <div class="h-2" bind:this={headerSentinel}></div>
</header>

{#if hasActions}
    <!-- FIXED & CENTERED. Wrapper ignores pointer events so it won't block the avatar. -->
    <div class={`fixed top-0 left-1/2 -translate-x-1/2 w-full ${maxWidthClass} z-20 pointer-events-none`}>
        <div class={`${fixedPaddingClass} transition-all duration-200
                 ${collapsed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <div class="mt-2 mb-3 flex justify-center">
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
        </div>
    </div>
{/if}

<section class={`mx-auto ${contentWidthClass} ${contentPaddingClass}`}>
    <slot />
</section>
