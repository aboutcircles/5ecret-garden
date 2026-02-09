<script lang="ts">
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import SelectAsset from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import SelectAmount from './3_Amount.svelte';
  import { onMount } from 'svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import { popupControls } from '$lib/shared/state/popup';
  interface Props {
    context: SendFlowContext;
  }

  let { context = $bindable() }: Props = $props();

  let selectedAsset: TokenBalanceRow | undefined = $state(undefined);

  onMount(() => {
    if (context?.selectedAsset) {
      selectedAsset = context.selectedAsset;
      // If we got here with a pre-selected asset, it means we probably
      // came from a flow where we want to pick another asset, 
      // but if the intention was to skip, 1_To.svelte should have handled it.
    }
  });

  function onselect(tokenBalanceRow: TokenBalanceRow) {
    context.selectedAsset = tokenBalanceRow;

    popupControls.open({
      title: 'Enter Amount',
      component: SelectAmount,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <SelectAsset {selectedAsset} balances={circlesBalances} {onselect} />
</FlowDecoration>
