<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw as LRefreshCw } from 'lucide';

  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import AddressComponent from '$lib/shared/ui/primitives/Address.svelte';
  import { derived, writable } from 'svelte/store';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openStep } from '$lib/shared/flow';
  import ConfirmGatewayUntrust from '$lib/areas/settings/flows/gateway/ConfirmGatewayUntrust.svelte';
  import GatewayTrustedAccountsList from '$lib/areas/settings/ui/components/GatewayTrustedAccountsList.svelte';
  import { fetchActiveTrustRowsByGateway } from '$lib/shared/data/circles/paymentGateways';
  import { isAddress } from '$lib/shared/utils/tx';
  import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
  import type { Address } from '@aboutcircles/sdk-types';

  import type { TrustRow } from '$lib/areas/settings/model/gatewayTypes';

  interface Props {
    gateway: string;
  }

  let { gateway }: Props = $props();

  let loadingTrusts: boolean = $state(false);
  let trusts: TrustRow[] = $state([]);
  let loadError: string | null = $state(null);
  const trustRowsStore = writable<TrustRow[]>([]);
  const trustRowsWithActions = derived(trustRowsStore, ($rows) =>
    $rows.map((row) => ({
      ...row,
      showRemove: true,
      onRemove: () => openRemoveTrust(row.trustReceiver)
    }))
  );

  $effect(() => {
    trustRowsStore.set(trusts);
  });

  const gatewayValid = $derived(isAddress((gateway ?? '').trim()));


  const canManageTrust = $derived(gatewayValid && !loadingTrusts);

  async function loadTrusts() {
    loadError = null;
    if (!gatewayValid || !$circles?.rpc) {
      trusts = [];
      return;
    }

    try {
      loadingTrusts = true;
      const entries: TrustRow[] = await fetchActiveTrustRowsByGateway($circles, gateway);

      trusts = entries;
      trustRowsStore.set(entries);
    } catch (e) {
      console.error('loadTrusts', e);
      trusts = [];
      trustRowsStore.set([]);
      loadError = e instanceof Error ? e.message : 'Failed to load trusted accounts.';
    } finally {
      loadingTrusts = false;
    }
  }

  onMount(loadTrusts);

  function openAddTrust() {
    if (!gatewayValid) return;
    openAddTrustFlow({
      context: {
        actorType: 'gateway',
        actorAddress: gateway as Address,
        selectedTrustees: [],
        gatewayExpiry: (1n << 96n) - 1n,
      },
      onCompleted: async () => {
        await loadTrusts();
      },
    });
  }

  function openRemoveTrust(trustReceiver: string) {
    if (!gatewayValid) return;
    openStep({
      title: 'Remove trust',
      component: ConfirmGatewayUntrust,
      props: {
        gateway,
        trustReceiver,
        onDone: async () => {
          await loadTrusts();
        }
      },
      key: `pg-untrust:${gateway}:${trustReceiver}`
    });
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-6" tabindex="-1" data-popup-initial-focus>
    <div class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-3">
      <Avatar address={gateway} view="vertical" clickable={false} />

      <div class="w-full flex justify-center">
        <AddressComponent address={gateway} />
      </div>

      <div class="text-sm font-medium leading-tight text-base-content/90">Manage trust</div>
      <div class="text-xs text-base-content/60 text-center">
        View, add, and remove trusted accounts for this gateway.
      </div>
    </div>

    <div class="space-y-4">

    {#if !gatewayValid}
      <StepAlert
        variant="warning"
        message="Gateway address is invalid. Trust management actions are disabled."
      />
    {/if}

    {#if loadError}
      <StepAlert variant="error" message={loadError} />
    {/if}

    <div class="mt-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="text-sm font-semibold">Trusted accounts</div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-xs btn-ghost btn-square"
            onclick={loadTrusts}
            disabled={!canManageTrust}
            aria-label={loadingTrusts ? 'Refreshing…' : 'Refresh'}
          >
            <Lucide icon={LRefreshCw} size={14} class={loadingTrusts ? 'animate-spin' : ''} />
            <span class="sr-only">{loadingTrusts ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button type="button" class="btn btn-sm btn-primary" onclick={openAddTrust} disabled={!canManageTrust}>
            Add
          </button>
        </div>
      </div>

      <GatewayTrustedAccountsList
        rows={trustRowsWithActions}
        loading={loadingTrusts}
      />
    </div>
    </div>
  </div>
</FlowDecoration>
