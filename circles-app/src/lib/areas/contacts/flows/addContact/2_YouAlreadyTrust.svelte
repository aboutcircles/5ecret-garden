<script lang="ts">
  import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
  import type { AddContactFlowContext } from '$lib/areas/contacts/flows/addContact/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { openStep } from '$lib/shared/flow/runtime';
  import { popupControls } from '$lib/shared/state/popup';
  import SearchStep from './1_Search.svelte';

  interface Props {
    context: AddContactFlowContext;
  }

  let { context }: Props = $props();

  function editSelection() {
    const didPop = popupControls.popTo((entry) => entry.component === SearchStep);
    if (!didPop) {
      openStep({
        title: 'Add contact',
        component: SearchStep,
      });
    }
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
  <FlowStepHeader
    step={2}
    total={2}
    title="Trust status"
    subtitle="Review current trust relationship and choose next action."
    labels={['Find account', 'Trust status']}
  />

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
  </div>
</FlowDecoration>
