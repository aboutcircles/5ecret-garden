<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import { RefreshCw as LRefreshCw } from 'lucide';

  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { derived, writable } from 'svelte/store';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openStep } from '$lib/shared/flow/runtime';
  import ManageTrustSearch from '$lib/areas/settings/flows/gateway/SearchTrustReceiver.svelte';
  import ConfirmGatewayUntrust from '$lib/areas/settings/flows/gateway/ConfirmGatewayUntrust.svelte';
  import GatewayTrustedAccountsList from '$lib/areas/settings/ui/components/GatewayTrustedAccountsList.svelte';
  import { fetchActiveTrustRowsByGateway } from '$lib/shared/data/circles/paymentGateways';

  import type { TrustRow } from '$lib/areas/settings/model/gatewayTypes';

  interface Props {
    gateway: string;
  }

  let { gateway }: Props = $props();

  let loadingTrusts: boolean = $state(false);
  let trusts: TrustRow[] = $state([]);
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

  function isAddress(v: string): boolean {
    try {
      ethers.getAddress((v || '').trim());
      return true;
    } catch {
      return false;
    }
  }

  const gatewayValid = $derived(isAddress(gateway));


  async function loadTrusts() {
    if (!gatewayValid || !$circles?.circlesRpc) {
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
    } finally {
      loadingTrusts = false;
    }
  }

  onMount(loadTrusts);

  function openAddTrust() {
    if (!gatewayValid) return;
    openStep({
      title: 'Add trusted account',
      component: ManageTrustSearch,
      props: {
        gateway,
        onTrusted: async () => {
          await loadTrusts();
        }
      }
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
  <div class="space-y-4">
    <div class="flex flex-col gap-1">
      <Avatar address={gateway} view="horizontal" clickable={false} />
      <div class="font-mono text-xs text-base-content/70 break-all">
        {gateway}
      </div>
    </div>

    <div class="mt-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="text-sm font-semibold">Trusted accounts</div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-xs btn-ghost btn-square"
            onclick={loadTrusts}
            disabled={loadingTrusts}
            aria-label={loadingTrusts ? 'Refreshing…' : 'Refresh'}
          >
            <Lucide icon={LRefreshCw} size={14} class={loadingTrusts ? 'animate-spin' : ''} />
            <span class="sr-only">{loadingTrusts ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button type="button" class="btn btn-sm btn-primary" onclick={openAddTrust}>
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
</FlowDecoration>
