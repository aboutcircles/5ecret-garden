<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { Sdk } from '@aboutcircles/sdk';
  import { goto } from '$app/navigation';
  import Avatar from './avatar/Avatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import { GroupType } from '@aboutcircles/sdk-types';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import CreateGroup from '$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte';
  import { resetCreateGroupContext } from '$lib/areas/groups/flows/createGroup/context';
  import { initNewSafeBrowserRunner } from '$lib/shared/state/wallet.svelte';
  import { circlesConfig } from '@aboutcircles/sdk-core';
  import { isGroupType, isOrganizationType } from '$lib/shared/utils/avatarHelpers';
  import { withRetry, isTransientError } from '$lib/shared/utils/retry';

  interface Props {
    address: Address;
    isRegistered: boolean;
    groups?: GroupRow[];
    sdk: Sdk;
    initSdk: (safeAddress: Address, targetAddress?: Address) => Promise<Sdk>;
    refreshGroupsCallback?: () => void;
  }

  let {
    address,
    isRegistered,
    initSdk,
    groups,
    sdk,
    refreshGroupsCallback,
  }: Props = $props();

  // Local loading state so only THIS card shows spinner, not all cards
  let isConnecting = $state(false);

  async function connectAvatar(avatarAddress?: Address) {
    //@todo pass runner here
    // Use the safe address if no specific avatar address is provided
    const targetAddress = avatarAddress ?? address;

    console.log('[ConnectCircles] connectAvatar called:', {
      targetAddress,
      safeAddress: address,
      isRegistered,
      isMainSafe: targetAddress === address,
    });

    // Set loading state for UI feedback (local per-card + global for avatar)
    isConnecting = true;
    avatarState.isLoading = true;

    try {
      // Always create SDK with the Safe address, not the group address
      const sdk = await initSdk(address, targetAddress);
      $circles = sdk;

      // If clicking on the main safe (not a group) and it's not registered, go to registration
      if (targetAddress === address && !isRegistered) {
        console.log('[ConnectCircles] Unregistered safe, redirecting to /register');
        await goto('/register');
        return;
      }

      // Use the new SDK to get the avatar for the target (could be Safe or Group)
      // Enable auto event subscription for reactive updates
      // Use retry logic for WebSocket subscription resilience
      try {
        avatarState.avatar = await withRetry(
          () => sdk.getAvatar(targetAddress, true),
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
                `[ConnectCircles] Avatar subscription failed (attempt ${attempt}/5), retrying in ${Math.round(delayMs / 1000)}s:`,
                error.message
              );
            },
          }
        );
      } catch (err: any) {
        console.error('[ConnectCircles] Failed to get avatar after retries:', err);

        // If avatar genuinely not found, redirect to registration
        if (err.message?.includes('Avatar not found') ||
            err.code === 'AVATAR_NOT_FOUND' ||
            err.code === 'SDK_AVATAR_NOT_FOUND') {
          await goto('/register');
          return;
        }
        throw err;
      }

      // Detect avatar type from the avatarInfo returned by SDK (now properly typed)
      const avatarType = avatarState.avatar.avatarInfo?.type;

      if (isGroupType(avatarType)) {
        avatarState.isGroup = true;
        avatarState.isHuman = false;
        // Try to detect group type - default to base group
        avatarState.groupType = GroupType.Standard;
      } else if (isOrganizationType(avatarType)) {
        avatarState.isGroup = false;
        avatarState.isHuman = false;
        avatarState.groupType = undefined;
      } else {
        // Default to human
        avatarState.isGroup = false;
        avatarState.isHuman = true;
        avatarState.groupType = undefined;
      }

      CirclesStorage.getInstance().data = {
        avatar: address,
        group: avatarState.isGroup ? avatarAddress : undefined,
        isGroup: avatarState.isGroup,
        groupType: avatarState.groupType,
        rings: settings.ring,
      };

      goto('/dashboard');
    } catch (err: any) {
      // Handle connection errors gracefully - don't let them become uncaught rejections
      console.error('[ConnectCircles] Connection failed:', err);

      const code = err?.code;
      if (code === 4900) {
        // Wallet not connected (MetaMask locked/disconnected)
        // The connect-safe page already has retry UI for this
      } else if (code === 4001) {
        // User rejected the request - they know what they did
      }
      // All errors handled - don't re-throw
    } finally {
      isConnecting = false;
      avatarState.isLoading = false;
    }
  }

  async function openCreateGroup() {
    try {
      const sdk = await initSdk(address);
      $circles = sdk;

      // Initialize a fresh context with feeCollection defaulted to this safe address
      resetCreateGroupContext(address as `0x${string}`);

      popupControls.open({
        title: 'Create group',
        component: CreateGroup,
        props: {
          setGroup: async (address: string) => {
            // On success, navigate into the new group#
            console.log(`Open the new group avatar dashboard. Address:`, address);
            refreshGroupsCallback?.();
          },
        },
        // Ensure state is cleared if the user closes the flow
        onClose: () => resetCreateGroupContext(),
      });
    } catch (err: any) {
      console.error('[ConnectCircles] Failed to open create group:', err);
      // Connection errors handled - don't re-throw
    }
  }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm relative transition-opacity duration-200"
  class:opacity-50={!isConnecting && avatarState.isLoading}
  class:pointer-events-none={!isConnecting && avatarState.isLoading}
>
  {#if isConnecting}
    <!-- Loading overlay when connecting to avatar -->
    <div class="absolute inset-0 bg-base-100/80 rounded-lg z-10 flex items-center justify-center gap-3">
      <span class="loading loading-spinner loading-md text-primary"></span>
      <span class="text-sm text-base-content/70">Connecting...</span>
    </div>
  {/if}
  <button
    onclick={() => connectAvatar(address)}
    class="flex justify-between items-center hover:bg-base-200 rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={isConnecting || avatarState.isLoading}
  >
    <Avatar topInfo="Safe" {address} clickable={false} view="horizontal" />
    <div class="btn btn-xs btn-outline btn-primary">
      {#if !isRegistered}
        register
      {:else}
        V2
      {/if}
    </div>
  </button>
  <div class="w-full flex gap-x-2 items-center justify-between mt-6 px-2">
    <p class="font-bold text-primary">My groups</p>
    <button
      onclick={() => openCreateGroup()}
      class="btn btn-xs btn-outline btn-primary"
      >Create a group
    </button>
  </div>
  <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
    {#each groups ?? [] as group}
      <button
        class="flex w-full hover:bg-base-200 rounded-lg p-2"
        onclick={() => connectAvatar(group.group as `0x${string}`)}
        disabled={isConnecting || avatarState.isLoading}
      >
        <Avatar
          address={group.group as `0x${string}`}
          clickable={false}
          view="horizontal"
          topInfo={group.group}
        />
      </button>
    {/each}
    {#if (groups ?? []).length === 0}
      <p class="text-sm">No groups available.</p>
    {/if}
  </div>
</div>
