<script lang="ts">
  import { page } from '$app/stores';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import {
    Home as LHome,
    Users as LUsers,
    Layers as LLayers,
    ShoppingBag as LShoppingBag,
    Settings as LSettings,
    Send as LSend,
    ChevronDown as LChevronDown,
  } from 'lucide';
  import { popupControls } from '$lib/shared/state/popup';

  const NAV_ITEMS = [
    { label: 'Wallet',   href: '/dashboard', icon: LHome },
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
  class="hidden md:flex flex-col w-[240px] shrink-0 h-full bg-base-100"
  style="border-right: 1px solid rgba(31,17,70,0.06);"
>
  <!-- Logo row -->
  <div class="flex items-center gap-2 px-5 h-[60px] shrink-0" style="border-bottom: 1px solid rgba(31,17,70,0.05);">
    <img src="/logo.svg" alt="Circles" class="w-7 h-7" />
    <span class="font-semibold text-[15px] tracking-tight text-base-content">Circles</span>
    <span class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold tracking-wider uppercase ml-0.5"
      style="background:rgba(31,17,70,0.06);color:rgba(15,10,30,0.40);">beta</span>
  </div>

  <!-- Account button -->
  {#if avatar}
    <div class="px-3 pt-3 pb-2">
      <button
        onclick={openProfile}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-base-200 cursor-pointer"
        style="border: 1px solid rgba(31,17,70,0.07);"
      >
        {#if avatarState.profile?.previewImageUrl}
          <img
            src={avatarState.profile.previewImageUrl}
            alt="avatar"
            class="w-8 h-8 rounded-full object-cover shrink-0"
          />
        {:else}
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span class="text-[13px] font-semibold text-primary-content">{initial}</span>
          </div>
        {/if}
        <div class="flex-1 min-w-0">
          <div class="text-[13.5px] font-[580] truncate text-base-content">{profile?.name ?? 'My Account'}</div>
          <div class="text-[11px] font-mono truncate" style="color:rgba(15,10,30,0.45);">
            {avatar.address.slice(0, 6)}…{avatar.address.slice(-4)}
          </div>
        </div>
        <Lucide icon={LChevronDown} size={14} class="shrink-0 opacity-40" ariaLabel="" />
      </button>
    </div>

    <!-- Send CTA -->
    <div class="px-3 pb-3">
      <button
        onclick={openSend}
        class="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-content text-[14px] font-[580] transition-opacity hover:opacity-90 active:scale-[0.98] cursor-pointer"
      >
        <Lucide icon={LSend} size={15} class="shrink-0" ariaLabel="" />
        Send
      </button>
    </div>
  {/if}

  <!-- Nav items -->
  <nav class="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
    {#each NAV_ITEMS as item}
      {@const active = isActive(item.href)}
      <a
        href={item.href}
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors no-underline"
        style="{active
          ? 'background:#EAE7FB;color:#352899;font-weight:580;'
          : 'color:#2A1F4A;font-weight:500;'}"
      >
        <Lucide icon={item.icon} size={17} class="shrink-0" ariaLabel="" />
        {item.label}
      </a>
    {/each}

    <a
      href="/settings"
      class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors no-underline"
      style="{$page.url.pathname.startsWith('/settings')
        ? 'background:#EAE7FB;color:#352899;font-weight:580;'
        : 'color:#2A1F4A;font-weight:500;'}"
    >
      <Lucide icon={LSettings} size={17} class="shrink-0" ariaLabel="" />
      Settings
    </a>
  </nav>

  <!-- Footer -->
  <div class="px-5 py-4 shrink-0" style="border-top: 1px solid rgba(31,17,70,0.05);">
    <p class="text-[11.5px]" style="color:rgba(15,10,30,0.38);">Circles v2 · Gnosis Chain</p>
  </div>
</aside>
