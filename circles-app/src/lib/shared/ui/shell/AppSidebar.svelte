<script lang="ts">
  import { page } from '$app/stores';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import {
    Wallet as LWallet,
    Send as LSend,
    Users as LUsers,
    Layers as LLayers,
    ShoppingBag as LShoppingBag,
    Settings as LSettings,
    Sparkles as LSparkles,
    Info as LInfo,
    UserCircle as LUserCircle,
  } from 'lucide';
  import { popupControls } from '$lib/shared/state/popup';
  import { T } from '$lib/design-system/tokens.js';
  import { settings } from '$lib/shared/state/settings.svelte';

  const NAV_ITEMS = [
    { label: 'Wallet',   href: '/dashboard', icon: LWallet },
    { label: 'Contacts', href: '/contacts',  icon: LUsers },
    { label: 'Groups',   href: '/groups',    icon: LLayers },
    { label: 'Market',   href: '/market',    icon: LShoppingBag },
  ];

  function isActive(href: string): boolean {
    const p = $page.url.pathname;
    return p === href || p.startsWith(href + '/');
  }

  const profile = $derived(avatarState.profile);
  const avatar  = $derived(avatarState.avatar);
  const initial = $derived((profile?.name ?? avatar?.address ?? 'U').charAt(0).toUpperCase());

  async function openSend(): Promise<void> {
    const { openSendFlowPopup } = await import('$lib/areas/wallet/flows/send/openSendFlowPopup');
    void openSendFlowPopup();
  }

  async function openProfile(): Promise<void> {
    if (!avatar) return;
    const { default: SettingProfile } = await import('$lib/areas/settings/ui/pages/SettingProfile.svelte');
    popupControls.open({ title: '', component: SettingProfile, props: { address: avatar.address } });
  }
</script>

<!-- Desktop-only sidebar; hidden on mobile -->
<aside
  class="hidden md:flex flex-col shrink-0 h-full"
  style="
    width:248px;background:{T.surface};
    border-right:1px solid {T.hairlineSoft};
    padding:20px 14px 18px;gap:18px;
  "
>
  <!-- Logo row -->
  <div style="padding:4px 10px 0;display:flex;align-items:center;gap:8px;">
    <img src="/logo.svg" alt="Circles" class="w-[26px] h-[26px]" />
    <button
      type="button"
      onclick={() => settings.advancedMode = !settings.advancedMode}
      title=""
      aria-label="beta"
      style="font-family:{T.fontSans};font-size:11px;color:{settings.advancedMode ? T.primary : T.inkFaint};padding:2px 7px;border-radius:9999px;border:0;background:{settings.advancedMode ? T.primaryFaint : T.pageDeep};font-weight:580;letter-spacing:0.04em;text-transform:lowercase;cursor:default;"
    >beta</button>
  </div>

  <!-- Account picker -->
  {#if avatar}
    <button
      onclick={openProfile}
      class="cursor-pointer text-left transition-colors appsidebar-account-btn"
      style="
        margin:0 4px;padding:10px 12px;display:flex;align-items:center;gap:10px;
        background:{T.surfaceAlt};border:1px solid {T.hairline};border-radius:14px;
      "
    >
      {#if avatarState.profile?.previewImageUrl}
        <img src={avatarState.profile.previewImageUrl} alt="avatar" class="w-8 h-8 rounded-full object-cover shrink-0" />
      {:else}
        <div style="width:32px;height:32px;border-radius:9999px;background:{T.primary};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:13px;font-weight:600;color:#fff;">{initial}</span>
        </div>
      {/if}
      <div class="flex-1 min-w-0">
        <div style="font-family:{T.fontSans};font-size:13.5px;font-weight:580;color:{T.ink};" class="truncate">{profile?.name ?? 'My Account'}</div>
        <div style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};" class="truncate">
          {avatar.address.slice(0, 6)}…{avatar.address.slice(-4)}
        </div>
      </div>
      <Lucide icon={LUserCircle} size={16} class="shrink-0" ariaLabel="" />
    </button>
  {/if}

  <!-- Nav -->
  <nav style="display:flex;flex-direction:column;gap:2px;padding:0 4px;">
    {#each NAV_ITEMS as item}
      {@const active = isActive(item.href)}
      <a
        href={item.href}
        class="no-underline cursor-pointer transition-colors"
        style="
          display:flex;align-items:center;gap:11px;
          padding:9px 12px;border-radius:10px;
          background:{active ? T.primarySoft : 'transparent'};
          color:{active ? T.primaryDeep : T.inkBody};
          font-family:{T.fontSans};font-size:13.5px;font-weight:{active ? 580 : 500};
        "
      >
        <Lucide icon={item.icon} size={17} class="shrink-0" ariaLabel="" />
        <span style="flex:1;">{item.label}</span>
      </a>
    {/each}

    <a
      href="/settings"
      class="no-underline cursor-pointer transition-colors"
      style="
        display:flex;align-items:center;gap:11px;
        padding:9px 12px;border-radius:10px;
        background:{$page.url.pathname.startsWith('/settings') ? T.primarySoft : 'transparent'};
        color:{$page.url.pathname.startsWith('/settings') ? T.primaryDeep : T.inkBody};
        font-family:{T.fontSans};font-size:13.5px;font-weight:{$page.url.pathname.startsWith('/settings') ? 580 : 500};
      "
    >
      <Lucide icon={LSettings} size={17} class="shrink-0" ariaLabel="" />
      <span style="flex:1;">Settings</span>
    </a>
  </nav>

  <!-- Send CTA -->
  {#if avatar}
    <div style="margin:0 4px;">
      <button
        onclick={openSend}
        class="cursor-pointer send-cta"
        style="
          width:100%;height:40px;border-radius:9999px;border:0;
          background:{T.primary};color:{T.surface};
          display:flex;align-items:center;justify-content:center;gap:8px;
          font-family:{T.fontSans};font-size:14px;font-weight:540;
          box-shadow:0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12);
        "
      >
        <Lucide icon={LSend} size={15} class="shrink-0" ariaLabel="" />
        Send Circles
      </button>
    </div>
  {/if}

  <!-- Footer -->
  <div style="margin-top:auto;padding:8px 8px 0;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;align-items:center;gap:8px;padding-top:10px;">
      <Lucide icon={LInfo} size={14} class="shrink-0" ariaLabel="" />
      <span style="font-size:11.5px;color:{T.inkFaint};">Circles v2 · Gnosis Chain</span>
    </div>
  </div>
</aside>

<style>
  .appsidebar-account-btn:hover {
    background: rgba(0,0,0,0.04);
  }
  .send-cta {
    transition: box-shadow 200ms ease-out, filter 200ms ease-out;
  }
  .send-cta:hover {
    box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 18px rgba(88,73,212,0.35) !important;
    filter: brightness(1.08);
  }
  .send-cta:active {
    filter: brightness(0.96);
    transition-duration: 60ms;
  }
</style>
