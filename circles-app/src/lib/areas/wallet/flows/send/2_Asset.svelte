<script lang="ts">
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import SelectAsset from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import SelectAmount from './3_Amount.svelte';
  import { onMount, tick } from 'svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import { openStep } from '$lib/shared/flow/runtime';
  import type { SelectAssetStepProps } from '$lib/shared/flow/contracts';
  import { popupControls } from '$lib/shared/state/popup';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import { SEND_POPUP_TITLE } from './constants';

  type ReturnMode = 'next' | 'back';

  type Props = SelectAssetStepProps<SendFlowContext> & {
    returnMode?: ReturnMode;
  };

  let { context = $bindable(), returnMode = 'next' }: Props = $props();

  let selectedAsset: TokenBalanceRow | undefined = $state(undefined);

  onMount(() => {
    if (context?.selectedAsset) {
      selectedAsset = context.selectedAsset;
      // If we got here with a pre-selected asset, it means we probably
      // came from a flow where we want to pick another asset, 
      // but if the intention was to skip, 1_To.svelte should have handled it.
    }
  });

  async function onselect(tokenBalanceRow: TokenBalanceRow) {
    context.selectedAsset = tokenBalanceRow;

    if (returnMode === 'back') {
      await tick();
      popupControls.back();
      return;
    }

    openStep({
      title: SEND_POPUP_TITLE,
      component: SelectAmount,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4">
    <FlowStepHeader
      step={2}
      total={3}
      title="Amount"
      subtitle="Choose route"
      labels={['Recipient', 'Amount', 'Review']}
    />
    <SelectAsset
      {selectedAsset}
      balances={circlesBalances}
      inputDataAttribute="data-send-step-initial-input"
      {onselect}
    />
  </div>
</FlowDecoration>
