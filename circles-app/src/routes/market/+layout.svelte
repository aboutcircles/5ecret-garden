<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  let { children }: { children?: Snippet } = $props();

  const navItems = [
    { label: 'Browse', href: '/market' },
    { label: 'Orders', href: '/market/orders' },
    { label: 'Sales', href: '/market/sales' },
    { label: 'Offers', href: '/market/offers' },
    { label: 'Gateways', href: '/market/gateways' },
  ];

  const pathname = $derived($page.url.pathname);
  // Browse is active only on the exact /market path; each sub-route matches its own path.
  const isActive = (href: string): boolean =>
    href === '/market' ? pathname === '/market' : pathname === href;
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
  <div style="padding:8px 18px 0;" class="md:!px-9 md:!pt-9 md:max-w-[1280px] md:mx-auto">

    <!-- Page title + actions (shared across all market sub-routes) -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 14px;gap:8px;">
      <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">Market</span>

      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <!-- Discreet market-admin entry. Recessed by default and only brightens on
             hover/focus, so it's reachable by operators who know it's there without
             inviting casual clicks. Non-admins who follow it land on /admin and get
             the friendly "not on the admin allowlist" message. -->
        <button
          onclick={() => goto('/admin')}
          aria-label="Market admin"
          title="Market admin"
          class="market-admin-link"
          style="
            height:40px;width:34px;border-radius:9999px;cursor:pointer;
            background:transparent;border:0;padding:0;
            display:inline-flex;align-items:center;justify-content:center;
            color:{T.inkMuted};opacity:0.38;
          "
        >
          <Icon name="shield" size={16} stroke="currentColor" strokeWidth={1.7} />
        </button>
        <a
          href="/market/offers"
          style="
            height:40px;padding:0 16px;border-radius:9999px;text-decoration:none;
            background:{T.primary};color:#fff;border:0;cursor:pointer;
            display:inline-flex;align-items:center;gap:6px;
            font-family:{T.fontSans};font-size:13.5px;font-weight:540;
            box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;
          "
        >
          <Icon name="plus" size={15} stroke="#fff" strokeWidth={2.2} />
          Post offer
        </a>
      </div>
    </div>

    <!-- Sub-nav pills -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
      {#each navItems as item (item.href)}
        {@const active = isActive(item.href)}
        <a
          href={item.href}
          class="market-tab"
          style="
            padding:8px 14px;border-radius:9999px;flex:0 0 auto;cursor:pointer;text-decoration:none;
            display:inline-flex;align-items:center;
            background:{active ? T.ink : T.surface};
            color:{active ? '#fff' : T.inkBody};
            border:{active ? 'none' : `1px solid ${T.hairline}`};
            font-family:{T.fontSans};font-size:12.5px;font-weight:580;
            box-shadow:{active ? 'none' : T.shadow.xs};
            transition:background .12s ease-out,color .12s ease-out;
            white-space:nowrap;
          "
        >{item.label}</a>
      {/each}
    </div>
  </div>

  {@render children?.()}
</div>

<style>
  /* Keep the admin shield recessed until intentionally hovered/focused. */
  .market-admin-link {
    transition: opacity 0.12s ease-out;
  }
  .market-admin-link:hover,
  .market-admin-link:focus-visible {
    opacity: 1 !important;
  }

  /* Match the settings pill focus ring: a box-shadow ring follows the pill radius
     exactly, so keyboard focus shows a clean ring hugging the pill. */
  .market-tab:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(88, 73, 212, 0.55) !important;
  }
</style>
