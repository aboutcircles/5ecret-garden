<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import { RefreshCw as LRefreshCw } from 'lucide';

  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { derived, writable } from 'svelte/store';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { popupControls } from '$lib/shared/state/popup';
  import ManageTrustSearch from '$lib/flows/paymentGateway/SearchTrustReceiver.svelte';
  import ConfirmGatewayUntrust from '$lib/flows/paymentGateway/ConfirmGatewayUntrust.svelte';
  import GatewayTrustedAccountsList from '$lib/components/gateway/GatewayTrustedAccountsList.svelte';

  import type { TrustRow } from '$lib/gateway/types';

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
      const resp = await $circles.circlesRpc.call<{
        columns: string[];
        rows: any[][];
      }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'TrustUpdated',
          Columns: [
            'trustReceiver',
            'expiry',
            'blockNumber',
            'transactionIndex',
            'logIndex'
          ],
          Filter: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'gateway',
              Value: gateway.toLowerCase()
            }
          ],
          Order: []
        }
      ]);

      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];

      const idxR = cols.indexOf('trustReceiver');
      const idxE = cols.indexOf('expiry');
      const idxB = cols.indexOf('blockNumber');
      const idxTi = cols.indexOf('transactionIndex');
      const idxLi = cols.indexOf('logIndex');

      type Agg = {
        expiry: number;
        blockNumber: number;
        transactionIndex: number;
        logIndex: number;
      };

      const map = new Map<string, Agg>();

      for (const r of rows) {
        const recv = r[idxR] ? ethers.getAddress(r[idxR]) : '';
        if (!recv) continue;
        const expiryNum = r[idxE] ? Number(r[idxE]) : 0;
        const bn = r[idxB] ? Number(r[idxB]) : 0;
        const ti = r[idxTi] ? Number(r[idxTi]) : 0;
        const li = r[idxLi] ? Number(r[idxLi]) : 0;
        const prev = map.get(recv);

        if (
          !prev ||
          bn > prev.blockNumber ||
          (bn === prev.blockNumber &&
            (ti > prev.transactionIndex ||
              (ti === prev.transactionIndex && li > prev.logIndex)))
        ) {
          map.set(recv, {
            expiry: expiryNum,
            blockNumber: bn,
            transactionIndex: ti,
            logIndex: li
          });
        }
      }

      const now = Math.floor(Date.now() / 1000);

      const entries: TrustRow[] = Array.from(map.entries())
        .map(([trustReceiver, v]) => ({
          trustReceiver,
          expiry: v.expiry,
          blockNumber: v.blockNumber,
          transactionIndex: v.transactionIndex,
          logIndex: v.logIndex
        }))
        .filter((row) => (row.expiry ?? 0) > now)
        .sort((a, b) => a.trustReceiver.localeCompare(b.trustReceiver));

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
    popupControls.open({
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
    popupControls.open({
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
