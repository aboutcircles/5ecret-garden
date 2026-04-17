<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { popToOrOpen } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';
  import { addTrustRelations } from '$lib/shared/utils/trustActions';
  import { ADD_TRUST_FLOW_SCAFFOLD_BASE } from './constants';
  import PickAccounts from './1_PickAccounts.svelte';
  import type { AddTrustFlowContext } from './context';

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
  <div class="space-y-4">
    <StepSection
      title={`Selected accounts (${selected.length})`}
      subtitle="Trust means you accept Circles from these accounts."
    >
      {#if selected.length === 0}
        <div class="text-sm opacity-70">No accounts selected.</div>
      {:else}
        <div class="w-full flex flex-col gap-y-1.5" role="list">
          {#each selected as address (address)}
            <div class="rounded-[var(--row-radius)]" role="listitem">
              <Avatar {address} view="horizontal" clickable={false} showTypeInfo={true} />
            </div>
          {/each}
        </div>
      {/if}
    </StepSection>

    <StepActionBar>
      {#snippet secondary()}
        <button type="button" class="btn btn-ghost btn-sm" onclick={changeSelection}>
          Change selection
        </button>
      {/snippet}

      {#snippet primary()}
        <ActionButton
          action={confirm}
          disabled={!canConfirm}
          title="Confirm trust"
          data-popup-default-action
          data-popup-initial-focus
        >
          {#snippet children()}Confirm{/snippet}
        </ActionButton>
      {/snippet}
    </StepActionBar>
  </div>
</FlowStepScaffold>
