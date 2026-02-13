<script lang="ts">
  import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
  import type { AddContactFlowContext } from '$lib/areas/contacts/flows/addContact/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { openStep } from '$lib/shared/flow/runtime';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    context: AddContactFlowContext;
  }

  let { context }: Props = $props();
</script>

<FlowDecoration>
  <p>You already trust this account.</p>

  <div class="mt-6 flex flex-col sm:flex-row gap-2">
    <button class="btn btn-primary" onclick={() => popupControls.close()}>
      Done
    </button>
    <button
      class="btn btn-error"
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
      Untrust...
    </button>
  </div>
</FlowDecoration>
