<script lang="ts">
    import { page } from '$app/stores';

    type Icon =
        | 'dashboard'
        | 'contacts'
        | 'groups'
        | 'settings'
        | 'default';

    type Item = { name: string; link: string; icon?: Icon };

    interface Props {
        items: Item[];
        /** Match your list/container width (e.g. 'max-w-3xl', 'max-w-4xl') */
        maxWidthClass?: string;
    }

    let { items, maxWidthClass = 'max-w-4xl' }: Props = $props();

    function isActive(link: string): boolean {
        return $page.url.pathname === link;
    }

    function guessIcon(name: string, link: string): Icon {
        const n = name.toLowerCase();
        const l = link.toLowerCase();
        if (n.includes('dashboard') || l.includes('/dashboard')) return 'dashboard';
        if (n.includes('contact') || l.includes('/contacts')) return 'contacts';
        if (n.includes('group') || l.includes('/groups')) return 'groups';
        if (n.includes('setting') || l.includes('/settings')) return 'settings';
        return 'default';
    }
</script>

<nav class={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full ${maxWidthClass} z-0`}>
    <div class="btm-nav bg-base-100 border-t shadow-sm rounded-t-box">
        {#each items as item (item.link)}
            {@const icon = item.icon ?? guessIcon(item.name, item.link)}
            <a
                    href={item.link}
                    class:active={isActive(item.link)}
                    aria-current={isActive(item.link) ? 'page' : undefined}
                    aria-label={item.name}
            >
                {#if icon === 'dashboard'}
                    <!-- home / dashboard -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 3l9 7.5M5 10.5V21h14V10.5" />
                    </svg>
                {:else if icon === 'contacts'}
                    <!-- contacts / people -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8v6m-3-3h6" />
                    </svg>
                {:else if icon === 'groups'}
                    <!-- groups / users -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4h-2M9 21v-2a4 4 0 0 1 4-4h2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                    </svg>
                {:else if icon === 'settings'}
                    <!-- settings / gear -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 4.5h3l.5 2.5a7.5 7.5 0 0 1 2.5 1.5l2.4-.7 1.5 2.6-1.9 1.7a7.5 7.5 0 0 1 .1 1.5 7.5 7.5 0 0 1-.1 1.5l1.9 1.7-1.5 2.6-2.4-.7a7.5 7.5 0 0 1-2.5 1.5l-.5 2.5h-3l-.5-2.5a7.5 7.5 0 0 1-2.5-1.5l-2.4.7L3.6 17l1.9-1.7A7.5 7.5 0 0 1 5.4 12c0-.5.04-1 .1-1.5L3.6 8.8l1.5-2.6 2.4.7a7.5 7.5 0 0 1 2.5-1.5l.5-2.5Z" />
                        <circle cx="12" cy="12" r="3.25" />
                    </svg>
                {:else}
                    <!-- fallback dot -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>
                {/if}

                <span class="btm-nav-label">{item.name}</span>
            </a>
        {/each}
    </div>
</nav>
