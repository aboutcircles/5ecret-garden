<script lang="ts">
  import { page } from '$app/stores';
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

<!-- Floating pill bottom tab bar — mobile only; hidden on md+ -->
<nav
  class="md:hidden fixed left-3 right-3 z-40 pointer-events-none"
  style="bottom: max(20px, calc(env(safe-area-inset-bottom) + 14px));"
  aria-label="Main navigation"
>
  <div
    class="pointer-events-auto flex items-center justify-between p-1.5 mx-auto max-w-md"
    style="
      height:64px;background:#FFFFFF;border-radius:9999px;
      box-shadow:0 6px 18px rgba(15,10,30,0.10), 0 24px 48px rgba(15,10,30,0.12), 0 0 0 1px rgba(15,10,30,0.04);
    "
  >
    <!-- Left nav items -->
    {#each leftItems as item (item.link)}
      {@const kind   = item.icon ?? guessIcon(item.name, item.link)}
      {@const icon   = ICONS[kind] ?? LCircle}
      {@const active = isActive(item.link)}
      <a
        href={item.link}
        aria-current={active ? 'page' : undefined}
        class="flex-1 no-underline"
        style="
          height:52px;border-radius:9999px;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
          background:{active ? '#EAE7FB' : 'transparent'};
          color:{active ? '#352899' : 'rgba(15,10,30,0.48)'};
          transition:background .14s, color .14s;
        "
      >
        <Lucide {icon} size={19} class="shrink-0" ariaLabel="" />
        <span class="text-[10px] font-[580] leading-none">{item.name}</span>
      </a>
    {/each}

    <!-- Centre Send FAB -->
    <button
      onclick={onSend}
      class="cursor-pointer transition-transform active:scale-95 mx-1"
      style="
        width:52px;height:52px;border-radius:9999px;border:0;
        background:#5849D4;color:#FFFFFF;
        display:inline-flex;align-items:center;justify-content:center;
        box-shadow:0 4px 14px rgba(88,73,212,0.5), inset 0 1px 0 rgba(255,255,255,0.18);
        flex-shrink:0;
      "
      aria-label="Send"
    >
      <Lucide icon={LSend} size={22} class="shrink-0" ariaLabel="" />
    </button>

    <!-- Right nav items -->
    {#each rightItems as item (item.link)}
      {@const kind   = item.icon ?? guessIcon(item.name, item.link)}
      {@const icon   = ICONS[kind] ?? LCircle}
      {@const active = isActive(item.link)}
      <a
        href={item.link}
        aria-current={active ? 'page' : undefined}
        class="flex-1 no-underline"
        style="
          height:52px;border-radius:9999px;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
          background:{active ? '#EAE7FB' : 'transparent'};
          color:{active ? '#352899' : 'rgba(15,10,30,0.48)'};
          transition:background .14s, color .14s;
        "
      >
        <Lucide {icon} size={19} class="shrink-0" ariaLabel="" />
        <span class="text-[10px] font-[580] leading-none">{item.name}</span>
      </a>
    {/each}
  </div>
</nav>
