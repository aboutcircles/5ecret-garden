<script lang="ts">
  import type {
    GatewayListRow,
    GatewayTrustRow,
  } from '$lib/shared/data/circles/paymentGateways';
  import { fetchActiveTrustRowsByGateway } from '$lib/shared/data/circles/paymentGateways';
  import { circles } from '$lib/shared/state/circles';
  import { get } from 'svelte/store';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import AddressComponent from '$lib/shared/ui/primitives/Address.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    gateways: GatewayListRow[];
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
  }

  let { gateways, loading = false, error = '', onRetry }: Props = $props();

  // Per-gateway expanded state and trust rows.
  let expanded: Record<string, boolean> = $state({});
  let trustsByGateway: Record<string, GatewayTrustRow[] | 'loading' | 'error'> = $state({});

  function explorerUrl(tx?: string): string | null {
    if (!tx) return null;
    return `https://gnosisscan.io/tx/${tx}`;
  }

  function formatTimestamp(ts?: number): string {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleString();
  }

  async function toggleExpand(gateway: string): Promise<void> {
    expanded[gateway] = !expanded[gateway];
    if (!expanded[gateway]) return;
    if (trustsByGateway[gateway] && trustsByGateway[gateway] !== 'error') return;
    trustsByGateway[gateway] = 'loading';
    try {
      const sdk = get(circles);
      if (!sdk) {
        trustsByGateway[gateway] = 'error';
        return;
      }
      const rows = await fetchActiveTrustRowsByGateway(sdk, gateway);
      trustsByGateway[gateway] = rows;
    } catch (e) {
      console.warn('[GatewaysPanel] trust fetch failed', e);
      trustsByGateway[gateway] = 'error';
    }
  }
</script>

{#if loading}
  <div class="flex items-center gap-2 text-base-content/70 py-2">
    <span class="loading loading-spinner loading-sm"></span>
    <span>Loading gateways…</span>
  </div>
{:else if error}
  <div class="alert alert-warning">
    <span>{error}</span>
    {#if onRetry}
      <button class="btn btn-xs ml-2" onclick={onRetry}>Retry</button>
    {/if}
  </div>
{:else if gateways.length === 0}
  <div class="text-sm opacity-70">No gateways</div>
{:else}
  <div class="space-y-1.5">
    {#each gateways as gw (gw.gateway)}
      <RowFrame dense={true} noLeading={true}>
        <button
          type="button"
          class="min-w-0 text-left w-full"
          onclick={() => toggleExpand(gw.gateway)}
          aria-expanded={!!expanded[gw.gateway]}
          aria-label={`Toggle gateway ${gw.gateway}`}
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs opacity-60">{expanded[gw.gateway] ? '▾' : '▸'}</span>
            <AddressComponent address={gw.gateway as Address} />
          </div>
          <div class="text-xs opacity-60 mt-0.5">
            Created {formatTimestamp(gw.timestamp)} · block {gw.blockNumber}
          </div>
        </button>
        {#snippet trailing()}
          {#if explorerUrl(gw.tx)}
            <a
              class="text-[10px] opacity-50 hover:underline"
              href={explorerUrl(gw.tx)}
              target="_blank"
              rel="noopener noreferrer"
            >
              tx ↗
            </a>
          {/if}
        {/snippet}
      </RowFrame>
      {#if expanded[gw.gateway]}
        <div class="ml-6 pl-3 border-l border-base-300 my-2">
          {#if trustsByGateway[gw.gateway] === 'loading'}
            <div class="flex items-center gap-2 text-xs text-base-content/70 py-1">
              <span class="loading loading-spinner loading-xs"></span>
              <span>Loading active trusts…</span>
            </div>
          {:else if trustsByGateway[gw.gateway] === 'error'}
            <div class="text-xs text-error">Failed to load trusts</div>
          {:else if Array.isArray(trustsByGateway[gw.gateway])}
            {@const rows = trustsByGateway[gw.gateway] as GatewayTrustRow[]}
            {#if rows.length === 0}
              <div class="text-xs opacity-60 py-1">No active trusts</div>
            {:else}
              <div class="text-[10px] opacity-50 mb-1">{rows.length} active trust{rows.length === 1 ? '' : 's'}</div>
              <div class="space-y-1">
                {#each rows as t (t.trustReceiver)}
                  <button
                    type="button"
                    class="w-full text-left"
                    onclick={() => openProfilePopup(t.trustReceiver as Address)}
                    aria-label={`Open avatar ${t.trustReceiver}`}
                  >
                    <Avatar
                      address={t.trustReceiver as Address}
                      clickable={true}
                      view="horizontal"
                      showTypeInfo={true}
                    />
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
