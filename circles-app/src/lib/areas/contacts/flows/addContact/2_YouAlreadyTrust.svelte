<script lang="ts">
  import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
  import type { AddContactFlowContext } from '$lib/areas/contacts/flows/addContact/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    context: AddContactFlowContext;
  }

  let { context }: Props = $props();
</script>

<FlowDecoration>
  <p>You already trust this account. Do you want to untrust it?</p>
  <button
    class="btn btn-error mt-6"
    onclick={() => {
      popupControls.close();
      popupControls.open({
        title: 'Untrust',
        component: Untrust,
        props: {
          address: context.selectedAddress,
        },
      });
    }}
  >
    Untrust
  </button>
</FlowDecoration>
