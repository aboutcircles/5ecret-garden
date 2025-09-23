<script lang="ts">
    import { page } from '$app/stores';
    import { popupState } from '$lib/stores/popUp';
    import { headerDropdownOpen } from '../stores/headerDropdown';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { Home as LHome, Users as LUsers, Layers as LLayers, Settings as LSettings, Circle as LCircle, Mail as LMail } from 'lucide';

    type Icon = 'dashboard' | 'contacts' | 'groups' | 'settings' | 'inbox' | 'default';
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
        const isInbox     = n.includes('inbox')     || l.includes('/inbox');

        if (isDashboard) { return 'dashboard'; }
        if (isContacts)  { return 'contacts'; }
        if (isGroups)    { return 'groups'; }
        if (isSettings)  { return 'settings'; }
        if (isInbox)     { return 'inbox'; }
        return 'default';
    }

    // Lucide icon map to remove if/else chains.
    const ICONS: Record<Icon, any> = {
        dashboard: LHome,
        contacts: LUsers,
        groups: LLayers,
        settings: LSettings,
        inbox: LMail,
        default: LCircle
    };

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
                    {@const iconKind = item.icon ?? guessIcon(item.name, item.link)}
                    {@const iconDef = ICONS[iconKind] ?? LCircle}
                    {@const active = isActive(item.link)}
                    {@const baseClasses = 'inline-flex items-center gap-3 rounded-full px-4 py-2 whitespace-nowrap transition-colors'}
                    {@const focusClasses = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-2'}
                    {@const stateClasses = active
                        ? 'bg-primary text-primary-content'
                        : 'text-base-content/90 hover:text-base-content hover:bg-base-200'
                    }

                    <a
                            href={item.link}
                            aria-current={active ? 'page' : undefined}
                            aria-label={item.name}
                            class={`${baseClasses} ${stateClasses} ${focusClasses}`}
                    >
                        <Lucide icon={iconDef} size={28} class="shrink-0 stroke-current pt-2" />
                        <span class="leading-none -mt-2">{item.name}</span>
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
