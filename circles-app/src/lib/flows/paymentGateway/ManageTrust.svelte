<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { runTask } from '$lib/utils/tasks';

  import TrustRowView from '../../../routes/gateway/TrustRow.svelte';
  import type { TrustRow } from '../../../routes/gateway/types';

  interface Props {
    gateway: string;
  }

  let { gateway }: Props = $props();

  const gatewayAbi = [
    'function setTrust(address trustReceiver, uint96 expiry)',
    'function clearTrust(address trustReceiver)'
  ];
  const gatewayIface = new ethers.Interface(gatewayAbi);

  let trustReceiver: string = $state('');
  // default expiry: 1 year from now
  let expiryIso: string = $state(
    new Date(Date.now() + 365 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 16)
  ); // yyyy-MM-ddTHH:mm

  let loadingTrusts: boolean = $state(false);
  let trusts: TrustRow[] = $state([]);

  function isAddress(v: string): boolean {
    try {
      ethers.getAddress((v || '').trim());
      return true;
    } catch {
      return false;
    }
  }

  function toExpiryUint96(iso: string): bigint {
    try {
      const ms = Date.parse(iso);
      const sec = Math.floor(ms / 1000);
      return BigInt(sec);
    } catch {
      return 0n;
    }
  }

  const gatewayValid = $derived(isAddress(gateway));
  const trustReceiverValid = $derived(isAddress(trustReceiver));
  const expiryValid = $derived(() => toExpiryUint96(expiryIso) > 0n);

  const canSet = $derived(gatewayValid && trustReceiverValid && expiryValid);
  const canClear = $derived(gatewayValid && trustReceiverValid);

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

      const entries: TrustRow[] = Array.from(map.entries()).map(
        ([trustReceiver, v]) => ({
          trustReceiver,
          expiry: v.expiry,
          blockNumber: v.blockNumber,
          transactionIndex: v.transactionIndex,
          logIndex: v.logIndex
        })
      );

      entries.sort((a, b) => {
        const aActive = (a.expiry ?? 0) > now ? 1 : 0;
        const bActive = (b.expiry ?? 0) > now ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return a.trustReceiver.localeCompare(b.trustReceiver);
      });

      trusts = entries;
    } catch (e) {
      console.error('loadTrusts', e);
      trusts = [];
    } finally {
      loadingTrusts = false;
    }
  }

  onMount(loadTrusts);

  async function setTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canSet) {
      throw new Error('Please provide a valid gateway, receiver and expiry.');
    }

    await runTask({
      name: 'Updating trust…',
      promise: (async () => {
        const expiry = toExpiryUint96(expiryIso);
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          expiry
        ]);
        const tx = await $wallet.sendTransaction!({
          to: gateway,
          value: 0n,
          data
        });
        await $wallet.provider.waitForTransaction(tx.hash);
        await loadTrusts();
      })()
    });
  }

  async function clearTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canClear) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    await runTask({
      name: 'Clearing trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('clearTrust', [
          trustReceiver
        ]);
        const tx = await $wallet.sendTransaction!({
          to: gateway,
          value: 0n,
          data
        });
        await $wallet.provider.waitForTransaction(tx.hash);
        await loadTrusts();
      })()
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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
      <label class="form-control w-full">
        <span class="label-text">Trust receiver</span>
        <input
          class="input input-bordered w-full font-mono"
          bind:value={trustReceiver}
          placeholder="0x…"
        />
      </label>

      <label class="form-control w-full">
        <span class="label-text">Expiry (UTC)</span>
        <input
          class="input input-bordered w-full"
          type="datetime-local"
          bind:value={expiryIso}
        />
      </label>
    </div>

    <div class="flex gap-3 mt-2">
      <button
        type="button"
        class="btn btn-primary flex-1"
        onclick={setTrust}
        disabled={!canSet}
      >
        Set trust
      </button>
      <button
        type="button"
        class="btn btn-outline flex-1"
        onclick={clearTrust}
        disabled={!canClear}
      >
        Clear trust
      </button>
    </div>

    <div class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm opacity-70">Latest expiry per receiver</div>
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          onclick={loadTrusts}
          disabled={loadingTrusts}
        >
          Refresh
        </button>
      </div>

      {#if loadingTrusts}
        <div class="loading loading-spinner loading-sm"></div>
      {:else if trusts.length === 0}
        <div class="text-sm opacity-70">No trust relations found yet.</div>
      {:else}
        <div class="flex flex-col gap-1.5">
          {#each trusts as item (item.trustReceiver)}
            <TrustRowView {item} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</FlowDecoration>
