<script lang="ts">
  import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
  import type { AddContactFlowContext } from '$lib/areas/contacts/flows/addContact/context';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { ADD_CONTACT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';
  import SearchStep from './1_Search.svelte';

  interface Props {
    context: AddContactFlowContext;
  }

  let { context }: Props = $props();

  function editSelection() {
    popToOrOpen(SearchStep, {
      title: 'Add contact',
    });
  }
</script>

<FlowStepScaffold
  {...ADD_CONTACT_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Trust status"
  subtitle="Review current trust relationship and choose next action."
>

  <StepAlert
    variant="info"
    title="Trust already exists"
    message="You already trust this account. You can close this flow or continue to untrust."
  />

  <StepActionBar>
    {#snippet secondary()}
      <button class="btn btn-ghost btn-sm" onclick={editSelection}>
        Change account
      </button>

      <button
        class="btn btn-error btn-outline btn-sm"
        onclick={() => {
          popupControls.close();
          openStep({
            title: 'Untrust',
            component: Untrust,
            props: {
              address: context.selectedAddress,
              trustVersion: context.trustVersion,
            },
          });
        }}
      >
        Untrust
      </button>
    {/snippet}

    {#snippet primary()}
      <button class="btn btn-primary btn-sm" onclick={() => popupControls.close()}>
        Done
      </button>
    {/snippet}
  </StepActionBar>
  </FlowStepScaffold>
