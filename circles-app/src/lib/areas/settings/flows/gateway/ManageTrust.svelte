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
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRow } from '$lib/areas/settings/model/gatewayTypes';
  import { T } from '$lib/design-system/tokens.js';

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

  $effect(() => { trustRowsStore.set(trusts); });

  const gatewayValid = $derived(isAddress((gateway ?? '').trim()));
  const canManageTrust = $derived(gatewayValid && !loadingTrusts);

  async function loadTrusts() {
    loadError = null;
    if (!gatewayValid || !$circles?.circlesRpc) { trusts = []; return; }
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
      onCompleted: async () => { await loadTrusts(); },
    });
  }

  function openRemoveTrust(trustReceiver: string) {
    if (!gatewayValid) return;
    openStep({
      title: 'Remove trust',
      component: ConfirmGatewayUntrust,
      props: { gateway, trustReceiver, onDone: async () => { await loadTrusts(); } },
      key: `pg-untrust:${gateway}:${trustReceiver}`
    });
  }
</script>

<FlowDecoration>
  <div style="width:100%;display:flex;flex-direction:column;gap:20px;" tabindex="-1" data-popup-initial-focus>
    <!-- Gateway hero -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <Avatar address={gateway} view="vertical" clickable={false} />
      <AddressComponent address={gateway} />
      <div style="font-size:13px;font-weight:580;color:{T.ink};">Manage trust</div>
      <div style="font-size:12px;color:{T.inkMuted};text-align:center;line-height:1.5;">
        View, add, and remove trusted accounts for this gateway.
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;">
      {#if !gatewayValid}
        <StepAlert variant="warning" message="Gateway address is invalid. Trust management actions are disabled." />
      {/if}

      {#if loadError}
        <StepAlert variant="error" message={loadError} />
      {/if}

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:13px;font-weight:580;color:{T.ink};">Trusted accounts</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <button
            type="button"
            style="width:28px;height:28px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkMuted};cursor:{canManageTrust ? 'pointer' : 'not-allowed'};display:inline-flex;align-items:center;justify-content:center;"
            onclick={loadTrusts}
            disabled={!canManageTrust}
            aria-label={loadingTrusts ? 'Refreshing…' : 'Refresh'}
          >
            <Lucide icon={LRefreshCw} size={13} class={loadingTrusts ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            style="height:32px;padding:0 16px;border-radius:9999px;border:0;background:{canManageTrust ? T.primary : T.pageDeep};color:{canManageTrust ? '#fff' : T.inkMuted};font-size:12.5px;font-weight:580;cursor:{canManageTrust ? 'pointer' : 'not-allowed'};"
            onclick={openAddTrust}
            disabled={!canManageTrust}
          >Add</button>
        </div>
      </div>

      <GatewayTrustedAccountsList rows={trustRowsWithActions} loading={loadingTrusts} />
    </div>
  </div>
</FlowDecoration>
