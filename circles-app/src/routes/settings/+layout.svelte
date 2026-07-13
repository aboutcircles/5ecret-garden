<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { browser } from '$app/environment';
  import { T } from '$lib/design-system/tokens.js';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';

  import PersonalSection from '$lib/areas/settings/ui/sections/PersonalSection.svelte';
  import KeysSection from '$lib/areas/settings/ui/sections/KeysSection.svelte';
  import NamespacesSection from '$lib/areas/settings/ui/sections/NamespacesSection.svelte';
  import BookmarksSection from '$lib/areas/settings/ui/sections/BookmarksSection.svelte';

  let { children }: { children?: Snippet } = $props();

  // ——— Personal settings state/actions ———
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { clearSession, signer } from '$lib/shared/state/wallet.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { get } from 'svelte/store';
  import { openMigrateToV2Flow } from '$lib/areas/wallet/flows/migrateToV2/openMigrateToV2Flow';
  import { ethers } from 'ethers';
  import { LogOut as LLogOut } from 'lucide';
  import type { Address } from '@aboutcircles/sdk-types';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { getProfilesBindings } from '$lib/areas/market/offers';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import {
    loadNamespacesProfileForSettings,
    saveNamespacesProfileForSettings,
  } from '$lib/areas/settings/state/settingsNamespaces';
  import { openConfirmPopup, openInfoPopup } from '$lib/shared/ui/shell/confirmDialogs';

  import { coerceTabId, type TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';
  import { settings, getActiveConfig } from '$lib/shared/state/settings.svelte';

  // Marketplace tabs (Orders, Sales, Offers, Payment gateways) live under /market as
  // sub-routes now; Settings keeps profile + advanced (bookmarks, applications, keys).
  const TAB_IDS = ['personal', 'bookmarks', 'keys', 'namespaces'] as const;
  type TabId = TabIdOf<typeof TAB_IDS>;

  // Friendly aliases for URL ?tab= values.
  const TAB_ALIASES: Record<string, TabId> = { profile: 'personal' };

  const TAB_LABELS: Record<TabId, string> = {
    personal: 'Profile',
    bookmarks: 'Bookmarks',
    keys: 'Signing keys',
    namespaces: 'Applications',
  };

  const TAB_ORDER: TabId[] = [
    'personal', 'bookmarks', 'namespaces', 'keys',
  ];

  let selectedTab = $state<TabId>('personal');

  // Advanced-only tabs are dropped from the strip in standard mode. The currently-selected
  // tab is always kept visible, so deep-links (?tab=keys) still resolve, and toggling advanced
  // mode off while viewing one doesn't yank it out from under you — it just won't reappear in
  // the strip once you navigate to a standard tab.
  const ADVANCED_TABS = new Set<TabId>(['bookmarks', 'namespaces', 'keys']);
  const visibleTabs = $derived(
    settings.advancedMode
      ? TAB_ORDER
      : TAB_ORDER.filter((id) => !ADVANCED_TABS.has(id) || id === selectedTab),
  );

  // `selectedTab` is the single source of truth for what renders. The `?tab=` URL
  // param is only a best-effort mirror for deep-linking, kept deliberately
  // NON-reactive:
  //   - read from `location` on mount and on back/forward (popstate) only;
  //   - written with native history.replaceState on click.
  // We do NOT use SvelteKit's `$page` store or `$app/navigation` replaceState here.
  // On this app that replaceState updates the address bar but does NOT update
  // `$page.url` (it records a stale `sveltekit:pageurl`), so a reactive URL→tab
  // effect read the stale value and reverted every click — the tab never moved.
  // An earlier variant used two effects mirroring URL↔state through async
  // replaceState and hung the tab under rapid switching. Keeping the URL fully
  // non-reactive removes both failure modes: a click sets `selectedTab` directly
  // (always moves) and nothing ever reads the URL back to override it.
  function tabFromLocation(): TabId {
    const raw = new URLSearchParams(location.search).get('tab');
    const resolved = raw && TAB_ALIASES[raw] ? TAB_ALIASES[raw] : raw;
    return coerceTabId(TAB_IDS, resolved, 'personal');
  }

  onMount(() => {
    selectedTab = tabFromLocation();
    const onPop = () => { selectedTab = tabFromLocation(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });

  function selectTab(id: TabId): void {
    selectedTab = id;
    if (!browser) return;
    const url = new URL(location.href);
    if (url.searchParams.get('tab') === id) return;
    url.searchParams.set('tab', id);
    // Native history API: updates the address bar for deep-linking without a
    // navigation, preserving SvelteKit's existing history.state keys.
    history.replaceState(history.state, '', url.href);
  }

  // ——— Shared / personal derived state ———
  const avatarAddress = $derived(
    (avatarState.avatar?.address ?? '') as Address | '',
  );

  const headerTitle = $derived(avatarState.profile?.name?.trim() || 'Settings');

  // Profile editing is delegated to ProfileExplorer to keep a single flow.
  const cfg = getActiveConfig();
  const pinApiBase = cfg.profilePinningServiceUrl ?? cfg.marketApiBase ?? '';

  // Latest profile CID for the connected avatar (if any)
  let profileCid: string | null = $state(null);
  let profileCidLoading: boolean = $state(false);
  let profileCidError: string | null = $state(null);

  async function loadProfileCid(): Promise<void> {
    profileCidLoading = true;
    profileCidError = null;
    profileCid = null;
    try {
      if (!avatarAddress) return;
      const { bindings } = getProfilesBindings({ pinApiBase });
      profileCid = (await bindings.getLatestProfileCid(avatarAddress)) || null;
    } catch (e: any) {
      profileCidError = String(e?.message ?? e);
    } finally {
      profileCidLoading = false;
    }
  }

  $effect(() => {
    // refresh on avatar change
    void loadProfileCid();
  });

  async function copyProfileCid(): Promise<void> {
    if (!profileCid) return;
    try {
      await navigator.clipboard?.writeText(profileCid);
    } catch {}
  }

  // ——— Namespaces (extracted from ProfileExplorer “Namespaces” panel) ———
  let nsLoading: boolean = $state(false);
  let nsError: string | null = $state(null);
  let nsResolvedAvatar: Address | null = $state(null);
  let nsNamespaces: Record<string, string> = $state({});

  const connectedAvatarLower = $derived(
    (avatarState.avatar?.address ?? '').toLowerCase(),
  );
  const nsAvatarLower = $derived((nsResolvedAvatar ?? '').toLowerCase());
  const nsIsOwner = $derived(
    !!connectedAvatarLower && !!nsAvatarLower && connectedAvatarLower === nsAvatarLower,
  );

  async function loadNamespacesProfile(): Promise<void> {
    nsLoading = true;
    nsError = null;
    nsResolvedAvatar = null;
    nsNamespaces = {};

    try {
      const loaded = await loadNamespacesProfileForSettings({
        avatarAddress,
        pinApiBase,
      });
      nsResolvedAvatar = loaded.resolvedAvatar;
      nsNamespaces = loaded.namespaces;
    } catch (e: any) {
      nsError = String(e?.message ?? e);
    } finally {
      nsLoading = false;
    }
  }

  $effect(() => {
    // Load namespaces only when the Namespaces tab is visible.
    if (selectedTab !== 'namespaces') return;
    void loadNamespacesProfile();
  });

  function onNamespacesChanged(e: CustomEvent<Record<string, string>>): void {
    nsNamespaces = e.detail;
    if (nsIsOwner) {
      void saveNamespacesProfile();
    }
  }

  async function saveNamespacesProfile(): Promise<void> {
    if (!nsResolvedAvatar) return;
    if (!nsIsOwner) return;
    await saveNamespacesProfileForSettings({
      resolvedAvatar: nsResolvedAvatar,
      namespaces: nsNamespaces,
      pinApiBase,
    });
  }

  async function migrateToV2() {
    await openMigrateToV2Flow();
  }

  async function stopV1() {
    const v1Token = avatarState.avatar?.avatarInfo?.v1Token;
    const sdk = get(circles);
    if (!sdk?.contractRunner || !v1Token) {
      throw new Error('Wallet or v1 token not available');
    }
    const v1TokenAddress: `0x${string}` = v1Token as `0x${string}`;

    try {
      const selector = ethers.keccak256(ethers.toUtf8Bytes('stop()')).slice(0, 10) as `0x${string}`;
      const tx = await sdk.contractRunner.sendTransaction!([{
        to: v1TokenAddress,
        data: selector,
        value: 0n,
      }]);
      console.log('Transaction sent:', tx);
    } catch (error) {
      console.error('Error calling stop():', error);
    }
  }

  // Delete only the locally stored private key (seed-derived). Keeps current session unless you disconnect.
  async function deleteLocalKey(): Promise<void> {
    try {
      const confirmDelete = await openConfirmPopup({
        title: 'Delete local key',
        message:
          'Delete the Circles magic words (private key) from this device? You will need to import them again next time you connect.',
      });
      if (!confirmDelete) return;
      CirclesStorage.getInstance().data = { privateKey: undefined };
      // Drop in-memory reference too
      signer.privateKey = undefined;
      await openInfoPopup({
        title: 'Key deleted',
        message: 'Local key deleted from this device. You remain connected until you disconnect.',
        tone: 'success',
      });
    } catch (e) {
      console.error('Failed to delete local key', e);
      await openInfoPopup({
        title: 'Delete failed',
        message: 'Failed to delete key. See console for details.',
        tone: 'error',
      });
    }
  }

  const actionsPersonal: Action[] = [
    {
      id: 'disconnect',
      label: 'Disconnect',
      iconNode: LLogOut,
      onClick: clearSession,
      variant: 'ghost',
    },
  ];

  const currentActions = $derived(!avatarAddress ? [] : actionsPersonal);

</script>

<div data-settings-shell style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
  <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

    <!-- Page header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 0 14px;">
      <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
        <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">{headerTitle}</span>
        {#if avatarAddress}
          <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};letter-spacing:0.02em;" class="select-all break-all">{avatarAddress}</span>
        {:else}
          <span style="font-size:12.5px;color:{T.inkMuted};">Profile, wallet, marketplace</span>
        {/if}
      </div>

      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        {#each currentActions.filter(Boolean) as a, i (a?.id ?? a?.label ?? i)}
          <button
            type="button"
            onclick={a.onClick}
            disabled={!!a?.disabled}
            aria-label={a.label}
            style="
              height:38px;padding:0 14px;border-radius:9999px;cursor:pointer;
              {a.variant === 'primary'
                ? `background:${T.primary};color:#fff;border:0;box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;`
                : `background:${T.surface};color:${T.ink};border:1px solid ${T.hairline};box-shadow:${T.shadow.xs};`}
              display:inline-flex;align-items:center;gap:6px;
              font-family:{T.fontSans};font-size:13px;font-weight:540;
              opacity:{a?.disabled ? 0.5 : 1};
            "
          >
            {#if a.iconNode}
              <Lucide icon={a.iconNode} size={14} class="shrink-0" />
            {/if}
            <span>{a.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Pill tabs -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
      {#each visibleTabs as id}
        {@const active = selectedTab === id}
        <button
          type="button"
          onclick={() => selectTab(id)}
          class="settings-tab"
          style="
            padding:8px 14px;border-radius:9999px;flex:0 0 auto;cursor:pointer;
            background:{active ? T.ink : T.surface};
            color:{active ? '#fff' : T.inkBody};
            border:{active ? 'none' : `1px solid ${T.hairline}`};
            font-family:{T.fontSans};font-size:12.5px;font-weight:580;
            box-shadow:{active ? 'none' : T.shadow.xs};
            transition:background .12s ease-out,color .12s ease-out;
            white-space:nowrap;
          "
        >{TAB_LABELS[id]}</button>
      {/each}
    </div>

    <!-- Section content -->
    <div style="display:flex;flex-direction:column;gap:14px;">
      {#if selectedTab === 'personal'}
        <PersonalSection
          {avatarAddress}
          {avatarState}
          {pinApiBase}
          {profileCid}
          {profileCidLoading}
          {profileCidError}
          {copyProfileCid}
        />
      {:else if selectedTab === 'bookmarks'}
        <BookmarksSection />
      {:else if selectedTab === 'keys'}
        <KeysSection {avatarAddress} {pinApiBase} {deleteLocalKey} />
      {:else if selectedTab === 'namespaces'}
        <NamespacesSection
          {avatarAddress}
          {pinApiBase}
          {nsError}
          {nsLoading}
          {nsResolvedAvatar}
          {nsNamespaces}
          {nsIsOwner}
          {onNamespacesChanged}
        />
      {:else}
        <div style="padding:20px;text-align:center;color:{T.inkMuted};font-size:13px;">Select a tab.</div>
      {/if}

      {@render children?.()}
    </div>

    <div style="height:24px;"></div>
  </div>
</div>

<style>
  /* The global focus-visible outline (app.css) renders as a rounded-rectangle on
     these fully-rounded pills because the browser caps the outline corner radius —
     it reads as a mismatched second border. A box-shadow ring follows the pill
     radius exactly, so keyboard focus shows a clean ring hugging the pill. Uses
     !important to win over the inline resting box-shadow on each tab. */
  .settings-tab:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(88, 73, 212, 0.55) !important;
  }
</style>