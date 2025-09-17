<script lang="ts">
    import { page } from '$app/stores';
    import { popupState } from '$lib/stores/popUp';
    import { headerDropdownOpen } from '../stores/headerDropdown.ts';

    type Icon = 'dashboard' | 'contacts' | 'groups' | 'settings' | 'default';
    type Item = { name: string; link: string; icon?: Icon };

    interface Props {
        items: Item[];
        maxWidthClass?: string; // e.g. 'max-w-4xl' or 'page page--lg'
    }

    let { items, maxWidthClass = 'max-w-4xl' }: Props = $props();

    function isActive(link: string): boolean {
        return $page.url.pathname === link;
    }

    function guessIcon(name: string, link: string): Icon {
        const n = name.toLowerCase();
        const l = link.toLowerCase();

        const isDashboard = n.includes('dashboard') || l.includes('/dashboard');
        const isContacts  = n.includes('contact')   || l.includes('/contacts');
        const isGroups    = n.includes('group')     || l.includes('/groups');
        const isSettings  = n.includes('setting')   || l.includes('/settings');

        if (isDashboard) { return 'dashboard'; }
        if (isContacts)  { return 'contacts'; }
        if (isGroups)    { return 'groups'; }
        if (isSettings)  { return 'settings'; }
        return 'default';
    }

    // runes-friendly
    let isPopupOpen: boolean = $derived($popupState.content !== null);
    let isHeaderDropdownOpen: boolean = $derived($headerDropdownOpen === true);
    let shouldHide: boolean = $derived(isPopupOpen || isHeaderDropdownOpen);
</script>

<nav
        class={`fixed inset-x-0 z-20 transition-all duration-200
            ${shouldHide ? 'translate-y-8 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
        style="bottom: calc(env(safe-area-inset-bottom) + 16px);"
        aria-hidden={shouldHide ? 'true' : 'false'}
>
    <div class={`mx-auto ${maxWidthClass} pointer-events-none flex justify-center`}>
        <div class="pointer-events-auto max-w-full">
            <!-- Use DaisyUI's look, but kill its full-width/fixed behavior -->
            <div class="btm-nav btm-nav--float bg-base-100/90 backdrop-blur-md border shadow-lg rounded-full px-2 py-1 max-w-full overflow-hidden">
                {#each items as item (item.link)}
                    {@const icon = item.icon ?? guessIcon(item.name, item.link)}
                    <a
                            href={item.link}
                            class:active={isActive(item.link)}
                            aria-current={isActive(item.link) ? 'page' : undefined}
                            aria-label={item.name}
                            class="px-3"
                    >
                        {#if icon === 'dashboard'}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                 class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 3l9 7.5M5 10.5V21h14V10.5"/>
                            </svg>
                        {:else if icon === 'contacts'}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" stroke-width="1.8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8v6m-3-3h6"/>
                            </svg>
                        {:else if icon === 'groups'}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" stroke-width="1.8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4h-2M9 21v-2a4 4 0 0 1 4-4h2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                            </svg>
                        {:else if icon === 'settings'}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" stroke-width="1.8">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M10.5 4.5h3l.5 2.5a7.5 7.5 0 0 1 2.5 1.5l2.4-.7 1.5 2.6-1.9 1.7c.06.5.06 1 0 1.5l1.9 1.7-1.5 2.6-2.4-.7a7.5 7.5 0 0 1-2.5 1.5l-.5 2.5h-3l-.5-2.5a7.5 7.5 0 0 1-2.5-1.5l-2.4.7L3.6 17l1.9-1.7a7.5 7.5 0 0 1-.1-1.5c0-.5.04-1 .1-1.5L3.6 8.8l1.5-2.6 2.4.7a7.5 7.5 0 0 1 2.5-1.5l.5-2.5Z"/>
                                <circle cx="12" cy="12" r="3.25"/>
                            </svg>
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="4"/>
                            </svg>
                        {/if}
                        <span class="btm-nav-label">{item.name}</span>
                    </a>
                {/each}
            </div>
        </div>
    </div>
</nav>

<style>
    /* Neutralize DaisyUI's fixed, full-width defaults for the floating variant. */
    :global(.btm-nav.btm-nav--float) {
        position: static;
        left: auto; right: auto;
        bottom: auto;
        width: max-content;
        grid-auto-columns: max-content;
    }
    :global(.btm-nav.btm-nav--float > *),
    :global(.btm-nav.btm-nav--float a) {
        width: auto;
        min-width: max-content;
    }
</style>
