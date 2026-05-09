<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { popToOrOpen } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';
  import { addTrustRelations } from '$lib/shared/utils/trustActions';
  import { ADD_TRUST_FLOW_SCAFFOLD_BASE } from './constants';
  import PickAccounts from './1_PickAccounts.svelte';
  import type { AddTrustFlowContext } from './context';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    context: AddTrustFlowContext;
    onCompleted?: (addresses: Address[]) => void | Promise<void>;
  }

  let { context, onCompleted }: Props = $props();

  const selected = $derived(Array.isArray(context.selectedTrustees) ? context.selectedTrustees : []);
  const canConfirm = $derived(selected.length > 0);

  async function confirm() {
    if (!canConfirm) return;
    await addTrustRelations({
      actorType: context.actorType,
      actorAddress: context.actorAddress,
      trustTargets: selected,
      gatewayExpiry: context.gatewayExpiry,
    });
    await onCompleted?.(selected);
    popupControls.close();
  }

  function changeSelection() {
    popToOrOpen(PickAccounts, {
      title: 'Pick accounts',
      props: { context, onCompleted },
      key: `add-trust:pick:${context.actorType}:${context.actorAddress}`,
    });
  }
</script>

<FlowStepScaffold {...ADD_TRUST_FLOW_SCAFFOLD_BASE} step={2} title="Confirm trust" subtitle="Review your selection before confirming.">
  <div style="display:flex;flex-direction:column;gap:14px;">

    <!-- Info note -->
    <div style="font-size:12px;color:{T.inkMuted};padding:0 2px;line-height:1.5;">
      Trusting means you accept Circles issued by {selected.length === 1 ? 'this account' : 'these accounts'}.
    </div>

    <!-- Accounts card -->
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
      <div style="padding:8px 14px;border-bottom:1px solid {T.hairlineSoft};font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">
        {selected.length === 1 ? 'Account' : `Accounts (${selected.length})`}
      </div>

      {#if selected.length === 0}
        <div style="padding:14px;font-size:12.5px;color:{T.inkMuted};">No accounts selected.</div>
      {:else}
        <div style="display:flex;flex-direction:column;" role="list">
          {#each selected as address, i (address)}
            <div style="padding:10px 14px;{i > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}" role="listitem">
              <Avatar {address} view="horizontal" clickable={false} showTypeInfo={true} />
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Actions -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <button
        type="button"
        style="height:36px;padding:0 16px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:13px;cursor:pointer;"
        onclick={changeSelection}
      >Change selection</button>

      <ActionButton
        action={confirm}
        disabled={!canConfirm}
        title="Confirm trust"
        data-popup-default-action
        data-popup-initial-focus
      >
        {#snippet children()}Confirm trust{/snippet}
      </ActionButton>
    </div>
  </div>
</FlowStepScaffold>
