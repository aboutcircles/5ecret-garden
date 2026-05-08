<script lang="ts">
  import { page } from '$app/stores';
  import { popupState } from '$lib/shared/state/popup';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import {
    Home as LHome,
    Users as LUsers,
    Layers as LLayers,
    ShoppingBag as LShoppingBag,
    Settings as LSettings,
    Circle as LCircle,
    Send as LSend,
  } from 'lucide';

  type Icon = 'dashboard' | 'contacts' | 'groups' | 'market' | 'settings' | 'default';
  type Item = { name: string; link: string; icon?: Icon };

  interface Props {
    items: Item[];
    onSend?: () => void;
  }

  let { items, onSend }: Props = $props();

  const ICONS: Record<Icon, any> = {
    dashboard: LHome,
    contacts:  LUsers,
    groups:    LLayers,
    market:    LShoppingBag,
    settings:  LSettings,
    default:   LCircle,
  };

  function guessIcon(name: string, link: string): Icon {
    const n = name.toLowerCase();
    const l = link.toLowerCase();
    if (n.includes('dashboard') || l.includes('/dashboard')) return 'dashboard';
    if (n.includes('contact')   || l.includes('/contacts'))  return 'contacts';
    if (n.includes('group')     || l.includes('/groups'))    return 'groups';
    if (n.includes('market')    || l.includes('/market'))    return 'market';
    if (n.includes('setting')   || l.includes('/settings'))  return 'settings';
    return 'default';
  }

  function isActive(link: string): boolean {
    const p = $page.url.pathname;
    return p === link || p.startsWith(link + '/');
  }

  // Split items so Send FAB sits in the centre
  const midpoint  = $derived(Math.ceil(items.length / 2));
  const leftItems  = $derived(items.slice(0, midpoint));
  const rightItems = $derived(items.slice(midpoint));
</script>

<!-- Full-width bottom tab bar — mobile only; hidden on md+ -->
<nav
  class="md:hidden shrink-0 bg-base-100"
  style="border-top: 1px solid rgba(31,17,70,0.08); padding-bottom: env(safe-area-inset-bottom);"
  aria-label="Main navigation"
>
  <div class="flex items-stretch h-[56px]">

    <!-- Left nav items -->
    {#each leftItems as item (item.link)}
      {@const kind   = item.icon ?? guessIcon(item.name, item.link)}
      {@const icon   = ICONS[kind] ?? LCircle}
      {@const active = isActive(item.link)}
      <a
        href={item.link}
        aria-current={active ? 'page' : undefined}
        class="flex-1 flex flex-col items-center justify-center gap-[3px] no-underline transition-colors"
        style="color:{active ? 'oklch(var(--p))' : 'rgba(15,10,30,0.42)'};"
      >
        <Lucide {icon} size={21} class="shrink-0" ariaLabel="" />
        <span class="text-[10px] font-[520] leading-none">{item.name}</span>
      </a>
    {/each}

    <!-- Centre Send FAB -->
    <div class="flex items-center justify-center px-3">
      <button
        onclick={onSend}
        class="w-[50px] h-[50px] rounded-full bg-primary text-primary-content flex items-center justify-center transition-transform active:scale-95 cursor-pointer -translate-y-2"
        style="box-shadow:0 4px 14px rgba(88,73,212,0.35);"
        aria-label="Send"
      >
        <Lucide icon={LSend} size={21} class="shrink-0" ariaLabel="" />
      </button>
    </div>

    <!-- Right nav items -->
    {#each rightItems as item (item.link)}
      {@const kind   = item.icon ?? guessIcon(item.name, item.link)}
      {@const icon   = ICONS[kind] ?? LCircle}
      {@const active = isActive(item.link)}
      <a
        href={item.link}
        aria-current={active ? 'page' : undefined}
        class="flex-1 flex flex-col items-center justify-center gap-[3px] no-underline transition-colors"
        style="color:{active ? 'oklch(var(--p))' : 'rgba(15,10,30,0.42)'};"
      >
        <Lucide {icon} size={21} class="shrink-0" ariaLabel="" />
        <span class="text-[10px] font-[520] leading-none">{item.name}</span>
      </a>
    {/each}

  </div>
</nav>
