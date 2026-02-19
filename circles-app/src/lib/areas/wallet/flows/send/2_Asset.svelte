<script lang="ts">
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import SelectAsset from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import SelectAmount from './3_Amount.svelte';
  import { onMount } from 'svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  interface Props {
    context: SendFlowContext;
  }

  let { context }: Props = $props();

  let selectedAsset: TokenBalance | undefined = $state(undefined);

  onMount(() => {
    if (context?.selectedAsset) {
      selectedAsset = context.selectedAsset;
    }
  });

  function onselect(tokenBalanceRow: TokenBalance) {
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
