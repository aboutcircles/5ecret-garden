<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import type { Sdk } from '@aboutcircles/sdk';
  import ConnectSafe from '$lib/areas/wallet/ui/onboarding/ConnectSafe.svelte';
  import ConnectCircles from '$lib/areas/wallet/ui/onboarding/ConnectCircles.svelte';
  import WalletLoader from '$lib/areas/wallet/ui/onboarding/WalletLoader.svelte';
  import SettingsDropdown from '$lib/areas/settings/ui/SettingsDropdown.svelte';

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
    title = 'Select avatar',
    helperText = 'Please select the avatar you want to use from the list below.',
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
</script>

<div class={`page page-pt page-stack ${sizeClass}`}>
  <div class="toolbar">
    <button type="button" class="back-btn" aria-label="Back" onclick={onBack}>
      <img src="/arrow-left.svg" alt="Back" class="icon mr-4" />
      <h1 class="h2">{title}</h1>
    </button>
    <div class="flex-grow"></div>
    <SettingsDropdown />
  </div>

  <p class="muted">{helperText}</p>

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
