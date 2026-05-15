<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { GroupRow } from '@circles-sdk/data';
  import type { Sdk } from '@circles-sdk/sdk';
  import ConnectSafe from '$lib/areas/wallet/ui/onboarding/ConnectSafe.svelte';
  import ConnectCircles from '$lib/areas/wallet/ui/onboarding/ConnectCircles.svelte';
  import WalletLoader from '$lib/areas/wallet/ui/onboarding/WalletLoader.svelte';
  import { T } from '$lib/design-system/tokens.js';

  type InitSdk = (address: Address) => Promise<Sdk>;

  interface LegacyMode {
    address: Address;
    isRegistered: boolean;
    groups: GroupRow[];
    isV1?: boolean;
    initSdk: InitSdk;
    refreshGroupsCallback?: () => void;
  }

  interface Props {
    title?: string;
    helperText?: string;
    sizeClass?: string;
    isLoading: boolean;
    safeOwnerAddress?: Address;
    sdk?: Sdk;
    initSdk?: InitSdk;
    safeCreationMode?: 'browser' | 'importedKey';
    refreshGroupsCallback?: () => void;
    onBack?: () => void;
    legacy?: LegacyMode;
  }

  let {
    title = 'Choose your Circles account',
    helperText = 'Select an account below to continue, or create a new one to get started.',
    sizeClass = 'page--lg',
    isLoading,
    safeOwnerAddress,
    sdk,
    initSdk,
    safeCreationMode = 'browser',
    refreshGroupsCallback,
    onBack = () => history.back(),
    legacy,
  }: Props = $props();

  const shortAddress = $derived(
    safeOwnerAddress
      ? `${safeOwnerAddress.slice(0, 6)}…${safeOwnerAddress.slice(-4)}`
      : undefined
  );
</script>

<div class={`page page-pt page-pb page-stack ${sizeClass}`} style="position:relative;">

  <!-- Soft gradient that bridges visually from the landing page -->
  <div style="
    pointer-events:none;
    position:absolute;top:0;left:-24px;right:-24px;height:280px;
    background:linear-gradient(180deg,{T.lilacSoft} 0%,transparent 100%);
    opacity:0.5;z-index:0;
  "></div>

  <!-- Back button -->
  <div style="position:relative;z-index:1;">
    <button
      type="button"
      aria-label="Back"
      onclick={onBack}
      style="
        display:inline-flex;align-items:center;justify-content:center;
        width:32px;height:32px;border-radius:9999px;border:0;
        background:transparent;cursor:pointer;color:{T.inkMuted};
      "
    >
      <img src="/arrow-left.svg" alt="Back" style="width:16px;height:16px;flex-shrink:0;" />
    </button>
  </div>

  <!-- Hero card -->
  <div style="
    position:relative;z-index:1;
    background:{T.surface};border:1px solid {T.hairlineSoft};
    border-radius:20px;padding:24px 28px;
    box-shadow:{T.shadow.xs};
  ">
    <h1 style="
      font-family:{T.fontDisplay};font-size:28px;font-weight:400;
      color:{T.ink};letter-spacing:-0.015em;margin:0 0 12px;line-height:1.1;
    ">{title}</h1>

    {#if shortAddress}
      <div style="
        display:inline-flex;align-items:center;gap:6px;
        padding:4px 12px;border-radius:9999px;
        background:{T.pageDeep};border:1px solid {T.hairlineSoft};
        margin-bottom:14px;
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:{T.sage};flex-shrink:0;"></span>
        <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkBody};">
          {shortAddress}
        </span>
      </div>
    {/if}

    <p style="font-size:13.5px;color:{T.inkMuted};margin:0;line-height:1.55;">
      {helperText}
    </p>
  </div>

  <!-- Content -->
  <div style="position:relative;z-index:1;">
    {#if isLoading}
      <WalletLoader />
    {:else if legacy}
      <ConnectCircles
        address={legacy.address}
        isRegistered={legacy.isRegistered}
        isV1={legacy.isV1}
        groups={legacy.groups}
        initSdk={legacy.initSdk}
        refreshGroupsCallback={legacy.refreshGroupsCallback}
      />
    {:else if safeOwnerAddress && sdk && initSdk}
      <ConnectSafe
        safeOwnerAddress={safeOwnerAddress}
        initSdk={initSdk}
        sdk={sdk}
        safeCreationMode={safeCreationMode}
        refreshGroupsCallback={refreshGroupsCallback}
      />
    {/if}
  </div>

</div>
