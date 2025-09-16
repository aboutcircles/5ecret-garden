<script lang="ts">
  import SelectAmount from '$lib/pages/SelectAmount.svelte';
  import Mint from './4_Mint.svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { GroupMintFlowContext } from '$lib/flows/mintGroupTokens/context';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    context: GroupMintFlowContext;
  }

  let { context = $bindable() }: Props = $props();

  if (context.amount === undefined) {
    context.amount = 0;
  }

  function handleSelect() {
    popupControls.open({
      title: 'Mint',
      component: Mint,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <SelectAmount asset={context.selectedAsset} bind:amount={context.amount} />
  <!-- Action Buttons -->
  <div class="flex justify-end space-x-2 mt-6">
    <button
      type="submit"
      class="btn btn-primary max-sm:w-full rounded-md text-white mt-8 md:mt-2"
      onclick={handleSelect}
    >
      Continue
    </button>
  </div>
</FlowDecoration>
