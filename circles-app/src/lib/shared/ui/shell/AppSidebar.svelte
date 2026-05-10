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

  const NAV_ITEMS = [
    { label: 'Wallet',   href: '/dashboard', icon: LWallet },
    { label: 'People',   href: '/contacts',  icon: LUsers },
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
    width:248px;background:#FFFFFF;
    border-right:1px solid rgba(31,17,70,0.05);
    padding:20px 14px 18px;gap:18px;
  "
>
  <!-- Logo row -->
  <div style="padding:4px 10px 0;display:flex;align-items:center;gap:8px;">
    <img src="/logo.svg" alt="Circles" class="w-[26px] h-[26px]" />
    <span style="font-family:'Inter Tight',sans-serif;font-size:11px;color:rgba(15,10,30,0.40);padding:2px 7px;border-radius:9999px;background:#EFEDE7;font-weight:580;letter-spacing:0.04em;text-transform:lowercase;">beta</span>
  </div>

  <!-- Account picker -->
  {#if avatar}
    <button
      onclick={openProfile}
      class="cursor-pointer text-left transition-colors appsidebar-account-btn"
      style="
        margin:0 4px;padding:10px 12px;display:flex;align-items:center;gap:10px;
        background:#FBFAF7;border:1px solid rgba(31,17,70,0.08);border-radius:14px;
      "
    >
      {#if avatarState.profile?.previewImageUrl}
        <img src={avatarState.profile.previewImageUrl} alt="avatar" class="w-8 h-8 rounded-full object-cover shrink-0" />
      {:else}
        <div style="width:32px;height:32px;border-radius:9999px;background:#5849D4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:13px;font-weight:600;color:#fff;">{initial}</span>
        </div>
      {/if}
      <div class="flex-1 min-w-0">
        <div style="font-family:'Inter Tight',sans-serif;font-size:13.5px;font-weight:580;color:#0F0A1E;" class="truncate">{profile?.name ?? 'My Account'}</div>
        <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:11px;color:rgba(15,10,30,0.62);" class="truncate">
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
          background:{active ? '#EAE7FB' : 'transparent'};
          color:{active ? '#352899' : '#2A1F4A'};
          font-family:'Inter Tight',sans-serif;font-size:13.5px;font-weight:{active ? 580 : 500};
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
        background:{$page.url.pathname.startsWith('/settings') ? '#EAE7FB' : 'transparent'};
        color:{$page.url.pathname.startsWith('/settings') ? '#352899' : '#2A1F4A'};
        font-family:'Inter Tight',sans-serif;font-size:13.5px;font-weight:{$page.url.pathname.startsWith('/settings') ? 580 : 500};
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
        class="cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.98]"
        style="
          width:100%;height:40px;border-radius:9999px;border:0;
          background:#5849D4;color:#FFFFFF;
          display:flex;align-items:center;justify-content:center;gap:8px;
          font-family:'Inter Tight',sans-serif;font-size:14px;font-weight:540;
          box-shadow:0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12);
        "
      >
        <Lucide icon={LSend} size={15} class="shrink-0" ariaLabel="" />
        Send Circles
      </button>
    </div>
  {/if}

  <!-- Footer -->
  <div style="margin-top:auto;padding:8px 8px 0;border-top:1px solid rgba(31,17,70,0.05);">
    <div style="display:flex;align-items:center;gap:8px;padding-top:10px;">
      <Lucide icon={LInfo} size={14} class="shrink-0" ariaLabel="" />
      <span style="font-size:11.5px;color:rgba(15,10,30,0.40);">Circles v2 · Gnosis Chain</span>
    </div>
  </div>
</aside>

<style>
  .appsidebar-account-btn:hover {
    background: rgba(0,0,0,0.04);
  }
</style>
