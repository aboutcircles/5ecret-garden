<script lang="ts">
  import {
    clearSession,
    getSignerFromPk,
    initNewSafeContractRunner,
    signer,
  } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@aboutcircles/sdk';
  import { gnosisConfig } from '$lib/circlesConfig';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { GroupType } from '@aboutcircles/sdk-types';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { CirclesStorage } from '$lib/utils/storage';
  import { goto } from '$app/navigation';
  import { isGroupType, isOrganizationType } from '$lib/utils/avatarHelpers';
  import { getActiveConfig } from '$lib/stores/settings.svelte';
  import { withRetry, isTransientError } from '$lib/utils/retry';

  onMount(async () => {
    const { address, privateKey } = (await getSignerFromPk()) ?? {};
    if (!address || !privateKey) {
      await clearSession();
      return;
    }

    signer.address = address;
    signer.privateKey = privateKey;

    // Initialize SDK for querying (using active config from settings)
    try {
      const sdk = new Sdk(getActiveConfig());
      circles.set(sdk);
    } catch (err) {
      console.error('Failed to initialize SDK:', err);
    }
  });

  async function connectCirclesGarden(
    safeAddress: Address,
    targetAddress?: Address
  ) {
    if (!signer.privateKey) {
      throw new Error('No private key found');
    }

    // Use targetAddress if provided (for groups), otherwise use safeAddress
    const addressToConnect = targetAddress ?? safeAddress;

    // Always create runner with the Safe address (the one controlled by the EOA)
    const runner = await initNewSafeContractRunner(
      signer.privateKey,
      safeAddress as Address
    );

    // Use active config from settings
    const sdk = new Sdk(getActiveConfig(), runner);
    circles.set(sdk);

    // Get avatar info for the target address (could be Safe or Group)
    // Enable auto event subscription for reactive updates
    // Use retry logic for WebSocket subscription resilience
    const avatar = await withRetry(
      () => sdk.getAvatar(addressToConnect, true),
      {
        maxAttempts: 5,
        initialDelayMs: 1000,
        maxDelayMs: 15000,
        updateConnectionStatus: true,
        statusLabel: 'Avatar',
        isRetryable: (err) => {
          // Don't retry if avatar genuinely not found
          if (err.message?.includes('Avatar not found') ||
              (err as any).code === 'AVATAR_NOT_FOUND' ||
              (err as any).code === 'SDK_AVATAR_NOT_FOUND') {
            return false;
          }
          return isTransientError(err);
        },
        onRetry: (attempt, error, delayMs) => {
          console.warn(
            `[ImportCircles] Avatar subscription failed (attempt ${attempt}/5), retrying in ${Math.round(delayMs / 1000)}s:`,
            error.message
          );
        },
      }
    ).catch((err) => {
      // If avatar not found after retries, return null to trigger registration redirect
      if (err.message?.includes('Avatar not found') ||
          err.code === 'AVATAR_NOT_FOUND' ||
          err.code === 'SDK_AVATAR_NOT_FOUND') {
        return null;
      }
      throw err;
    });

    if (!avatar) {
      console.error('Failed to get avatar for address:', addressToConnect);
      await goto('/register');
      return sdk;
    }

    avatarState.avatar = avatar;

    // Detect avatar type from the avatarInfo (now properly typed)
    const avatarType = avatar.avatarInfo?.type;

    if (isGroupType(avatarType)) {
      avatarState.isGroup = true;
      avatarState.isHuman = false;
      avatarState.groupType = GroupType.Standard;
    } else if (isOrganizationType(avatarType)) {
      avatarState.isGroup = false;
      avatarState.isHuman = false;
      avatarState.groupType = undefined;
    } else {
      avatarState.isGroup = false;
      avatarState.isHuman = true;
      avatarState.groupType = undefined;
    }

    // Store in CirclesStorage
    CirclesStorage.getInstance().data = {
      privateKey: signer.privateKey,
      avatar: safeAddress, // Store the Safe address
      group: avatarState.isGroup ? addressToConnect : undefined, // Store group address if applicable
      isGroup: avatarState.isGroup,
      groupType: avatarState.groupType,
    };

    // Navigate to dashboard
    await goto('/dashboard');

    return sdk;
  }

  function goBack(): void {
    history.back();
  }
</script>

<div class="page page-pt page-stack page--lg">
  <div class="toolbar">
    <button type="button" class="back-btn" aria-label="Back" onclick={goBack}>
      <img src="/arrow-left.svg" alt="Back" class="icon mr-4" />
      <h1 class="h2">Select Account</h1>
    </button>
    <div class="flex-grow"></div>
    <SettingsDropdown />
  </div>

  <p class="muted">
    Please select the account you want to use from the list below.
  </p>

  {#if !signer.address || !$circles}
    <WalletLoader />
    {#if signer.address}
      <p class="muted">Waiting for SDK to initialize...</p>
    {/if}
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectCirclesGarden}
      sdk={$circles}
    />
  {/if}
</div>
