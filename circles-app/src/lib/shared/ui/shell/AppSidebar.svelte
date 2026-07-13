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
    UserPlus as LUserPlus,
  } from 'lucide';
  import { popupControls } from '$lib/shared/state/popup';
  import { canCreateInviteLinks } from '$lib/areas/invites/data/canCreateInviteLinks';
  import { T } from '$lib/design-system/tokens.js';
  import { isWebsocketConnected } from '$lib/shared/state/realtimeSync';
  import { settings, toggleAdvancedMode } from '$lib/shared/state/settings.svelte';
  import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
  import EnvironmentInfoPopup from '$lib/shared/ui/shell/EnvironmentInfoPopup.svelte';
  import ServerSwitcher from '$lib/shared/ui/shell/ServerSwitcher.svelte';

  // "Invite" is only meaningful for human v2 avatars. While the avatar is still
  // restoring (`avatar` undefined) we OPTIMISTICALLY reserve its slot — the common
  // case is a human avatar that can invite, so showing it during load eliminates the
  // pop-in that previously inserted Invite mid-nav and shoved Groups/Market down on
  // resolve. A non-human avatar (org/group) simply drops the slot once resolved (rare).
  const showInvite = $derived(
    !avatarState.avatar || canCreateInviteLinks(avatarState.avatar)
  );
  const NAV_ITEMS = $derived.by(() => {
    const items = [
      { label: 'Wallet',   href: '/dashboard', icon: LWallet },
      { label: 'Contacts', href: '/contacts',  icon: LUsers },
    ];
    if (showInvite) {
      items.push({ label: 'Invite', href: '/invites', icon: LUserPlus });
    }
    items.push(
      { label: 'Groups', href: '/groups', icon: LLayers },
      { label: 'Market', href: '/market', icon: LShoppingBag },
    );
    return items;
  });

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

  // Footer network/realtime indicator. The SDK's websocket flag is non-reactive, so poll
  // it to keep the dot + tooltip current; the (i) row opens a fuller details popup.
  const networkLabel = $derived(settings.network === 'chiado' ? 'Chiado' : 'Gnosis Chain');
  let wsConnected = $state<boolean | undefined>(undefined);
  $effect(() => {
    const tick = () => {
      wsConnected = isWebsocketConnected();
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  });
  const wsDotColor = $derived(
    wsConnected === true ? T.positive : wsConnected === false ? T.negative : T.inkFaint,
  );
  const realtimeLabel = $derived(
    wsConnected === true
      ? 'Realtime connected'
      : wsConnected === false
        ? 'Realtime disconnected'
        : 'Realtime status unknown',
  );

  function openEnvInfo(): void {
    popupControls.open({ title: 'Environment', component: EnvironmentInfoPopup, props: {} });
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
    <!-- The "beta" label doubles as the Advanced-mode toggle: click to reveal power-user
         features (extra Settings tabs, raw profile CID, product IPFS/CID, …). -->
    <span
      role="button"
      tabindex="0"
      aria-pressed={settings.advancedMode}
      onclick={toggleAdvancedMode}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAdvancedMode(); } }}
      title={settings.advancedMode ? 'Advanced mode on — click to switch to standard' : 'Toggle advanced mode'}
      style="font-family:{T.fontSans};font-size:11px;color:{settings.advancedMode ? T.primary : T.inkMuted};padding:2px 7px;border-radius:9999px;background:{settings.advancedMode ? T.primaryFaint : T.pageDeep};font-weight:580;letter-spacing:0.04em;text-transform:lowercase;cursor:pointer;">beta</span>
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
  {:else}
    <!-- Skeleton placeholder while the avatar restores. Matches the real account card's
         height (10px padding + 32px avatar) so the nav below doesn't shift when it loads. -->
    <div
      aria-hidden="true"
      style="
        margin:0 4px;padding:10px 12px;display:flex;align-items:center;gap:10px;
        background:{T.surfaceAlt};border:1px solid {T.hairline};border-radius:14px;
      "
    >
      <div class="appsidebar-skel" style="width:32px;height:32px;border-radius:9999px;flex-shrink:0;"></div>
      <!-- Column height matches the real card's two-line text block (name + address) so
           the card totals the same ~59px and the nav below it doesn't shift on resolve. -->
      <div class="flex-1 min-w-0" style="display:flex;flex-direction:column;justify-content:center;gap:8px;height:37px;">
        <div class="appsidebar-skel" style="height:12px;width:58%;border-radius:6px;"></div>
        <div class="appsidebar-skel" style="height:10px;width:40%;border-radius:6px;"></div>
      </div>
    </div>
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

  <!-- Footer: server switch + network/live realtime status (opens an environment-details popup). -->
  <div style="margin-top:auto;padding:10px 8px 0;border-top:1px solid {T.hairlineSoft};display:flex;flex-direction:column;gap:4px;">
    <ServerSwitcher direction="up" />
    <Tooltip content={`${realtimeLabel} · click for details`} class="block w-full">
      <button
        type="button"
        onclick={openEnvInfo}
        aria-label={`Environment: Circles v2 on ${networkLabel}. ${realtimeLabel}. Click for details.`}
        class="appsidebar-env-btn"
        style="display:flex;align-items:center;gap:8px;width:100%;background:transparent;border:0;padding:10px 0 0;cursor:pointer;text-align:left;"
      >
        <Lucide icon={LInfo} size={14} class="shrink-0" ariaLabel="" />
        <span style="font-size:11.5px;color:{T.inkMuted};">Circles v2 · {networkLabel}</span>
        <span
          style="margin-left:auto;width:7px;height:7px;border-radius:9999px;background:{wsDotColor};flex-shrink:0;"
          aria-hidden="true"
        ></span>
      </button>
    </Tooltip>
  </div>
</aside>

<style>
  .appsidebar-account-btn:hover {
    background: rgba(0,0,0,0.04);
  }
  .appsidebar-skel {
    background: color-mix(in oklab, currentColor 13%, transparent);
  }
  @media (prefers-reduced-motion: no-preference) {
    .appsidebar-skel {
      animation: appsidebar-skel-pulse 1.4s ease-in-out infinite;
    }
    @keyframes appsidebar-skel-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
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
