<script lang="ts">
  import Untrust from '$lib/pages/Untrust.svelte';
  import type { AddContactFlowContext } from '$lib/flows/addContact/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { popupControls } from '$lib/stores/popUp';

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
