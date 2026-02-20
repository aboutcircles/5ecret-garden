<script lang="ts">
  import type { TokenBalanceRow } from '@aboutcircles/sdk-types';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import SelectAsset from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import SelectAmount from './3_Amount.svelte';
  import { onMount, tick } from 'svelte';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { SEND_FLOW_SCAFFOLD_BASE, SEND_POPUP_TITLE } from './constants';
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import { openStep } from '$lib/shared/flow';
  import type { SelectAssetStepProps } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';

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

<FlowStepScaffold
  {...SEND_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Asset"
  subtitle="Choose the asset you want to send."
>
    <SelectAsset
      {selectedAsset}
      balances={circlesBalances}
      inputDataAttribute="data-send-step-initial-input"
      {onselect}
    />
  </FlowStepScaffold>

