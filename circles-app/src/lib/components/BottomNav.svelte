<script lang="ts">
    import { page } from '$app/stores';
    import { popupState } from '$lib/stores/popUp';
    import { headerDropdownOpen } from '../stores/headerDropdown.ts';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { Home as LHome, Users as LUsers, Layers as LLayers, Settings as LSettings, Circle as LCircle } from 'lucide';

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
                            class={`rounded-full ${isActive(item.link) ? 'bg-primary text-primary-content px-3 py-1.5' : 'text-base-content hover:bg-base-200 px-3 py-1.5'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-2`}
                    >
                        {#if icon === 'dashboard'}
                            <Lucide icon={LHome} size={20} class={isActive(item.link) ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
                        {:else if icon === 'contacts'}
                            <Lucide icon={LUsers} size={20} class={isActive(item.link) ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
                        {:else if icon === 'groups'}
                            <Lucide icon={LLayers} size={20} class={isActive(item.link) ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
                        {:else if icon === 'settings'}
                            <Lucide icon={LSettings} size={20} class={isActive(item.link) ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
                        {:else}
                            <Lucide icon={LCircle} size={20} class={isActive(item.link) ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
                        {/if}
                        <span class={`btm-nav-label ${isActive(item.link) ? '' : 'text-base-content/80'}`}>{item.name}</span>
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
