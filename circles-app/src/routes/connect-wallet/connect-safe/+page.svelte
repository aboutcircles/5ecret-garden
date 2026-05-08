<script lang="ts">
  import SelectAvatarPage from '$lib/areas/wallet/ui/onboarding/SelectAvatarPage.svelte';
  import {
    getSigner,
    initBrowserProviderContractRunner,
    initSafeSdkBrowserContractRunner,
    signer,
    wallet,
  } from '$lib/shared/state/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { type AvatarRow, type GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import { circles } from '$lib/shared/state/circles';
  import { config } from '../../../config';
  import { get } from 'svelte/store';

  let groupsByOwner: Record<Address, GroupRow[]> | undefined = $state();
  let avatarInfo: AvatarRow | undefined = $state();
  let runner: SdkContractRunner | undefined = $state(get(wallet));
  let initError: string | null = $state(null);
  let initInFlight = $state(false);
  let unwatch: (() => void) | null = null;

  async function bootstrapRunner() {
    if (initInFlight) {
      console.log('[connect-safe] bootstrapRunner: already in flight, skipping');
      return;
    }
    initInFlight = true;
    initError = null;

    console.log('[connect-safe] bootstrapRunner start, current signer.address:', signer.address);

    try {
      console.log('[connect-safe] calling getSigner...');
      const fetched = await getSigner();
      console.log('[connect-safe] getSigner returned:', fetched);
      // Only assign if we actually got an address — never clobber a known good one.
      if (fetched) {
        signer.address = fetched;
      }

      console.log('[connect-safe] calling initBrowserProviderContractRunner...');
      const newRunner = await initBrowserProviderContractRunner();
      console.log('[connect-safe] runner ready:', !!newRunner);
      runner = newRunner;
    } catch (err) {
      console.error('[connect-safe] init failed:', err);
      initError = (err as Error)?.message ?? 'Could not initialise wallet';
    } finally {
      initInFlight = false;
    }
  }

  onMount(async () => {
    // Subscribe to wagmi account changes so signer.address stays up-to-date
    // even if reconnect resolves slowly.
    try {
      const { watchAccount } = await import('@wagmi/core');
      unwatch = watchAccount(config, {
        onChange(account) {
          if (account.address) {
            const next = account.address.toLowerCase() as Address;
            if (signer.address !== next) {
              console.log('[connect-safe] watchAccount → signer.address =', next);
              signer.address = next;
            }
          }
        },
      });
    } catch (err) {
      console.error('[connect-safe] watchAccount setup failed:', err);
    }

    await bootstrapRunner();
  });

  onDestroy(() => {
    unwatch?.();
  });

  async function connectLegacy(address: Address) {
    runner = await initBrowserProviderContractRunner();
    wallet.set(runner);
    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  async function connectSafe(address: Address) {
    runner = await initSafeSdkBrowserContractRunner(address);
    wallet.set(runner);
    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  $effect(() => {
    // Only set the circles SDK when we have our own runner ready. Don't
    // reset it to undefined while we're still initialising — the layout's
    // restoreSession() may have already populated the circles store with
    // a working SDK, and clobbering it produces a flash of broken state.
    if (runner) {
      circles.set(
        new Sdk(
          runner,
          settings.ring ? gnosisConfig.rings : gnosisConfig.production
        )
      );
    }
  });

  $effect(() => {
    (async () => {
      if (!signer.address || !$circles) return;
      groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
        signer.address,
      ]);
      avatarInfo = await $circles.data.getAvatarInfo(signer.address);
    })();
  });

  function goBack(): void {
    history.back();
  }

  async function refreshGroups() {
      if (!signer.address || !$circles) return;
      groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
          signer.address,
      ]);
  }
</script>

<SelectAvatarPage
  isLoading={!signer.address || !$circles}
  onBack={goBack}
  safeOwnerAddress={signer.address}
  sdk={$circles}
  initSdk={connectSafe}
  safeCreationMode="browser"
  refreshGroupsCallback={refreshGroups}
  legacy={settings.legacy && signer.address
    ? {
        address: signer.address,
        isRegistered: avatarInfo !== undefined,
        groups: groupsByOwner?.[signer.address] ?? [],
        initSdk: connectLegacy,
        refreshGroupsCallback: refreshGroups,
      }
    : undefined}
/>

{#if (!signer.address || !$circles) && !initInFlight}
  <div class="page page--md mx-auto mt-4 px-4">
    <div class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-3">
      <p class="text-sm">
        {#if initError}
          Wallet init failed: <span class="text-error">{initError}</span>
        {:else}
          Wallet didn't finish connecting. Try again?
        {/if}
      </p>
      <button type="button" class="btn btn-sm btn-primary" onclick={() => bootstrapRunner()}>
        Retry
      </button>
    </div>
  </div>
{/if}
