<script lang="ts">
  import Send from '$lib/pages/Send.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { roundToDecimals, shortenAddress } from '$lib/utils/shared';
  import { avatar } from '$lib/stores/avatar';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { TransitiveTransferTokenAddress } from '$lib/pages/SelectAsset.svelte';
  import { popupControls } from '$lib/stores/popUp';

  export let context: SendFlowContext;

  function handleSend() {
    if (!$avatar) {
      throw new Error('Avatar not found');
    }
    if (!context.selectedAddress) {
      throw new Error('No address selected');
    }
    if (!context.selectedAsset) {
      throw new Error('No asset selected');
    }
    if (!context.amount) {
      throw new Error('No amount specified');
    }
    runTask({
      name: `Send ${roundToDecimals(context.amount)} ${tokenTypeToString(context.selectedAsset.tokenType)} to ${shortenAddress(context.selectedAddress)} ...`,
      promise:
        context.selectedAsset.tokenAddress == TransitiveTransferTokenAddress
          ? $avatar.transfer(context.selectedAddress, context.amount)
          : $avatar.transfer(
              context.selectedAddress,
              context.amount,
              context.selectedAsset.tokenAddress
            ),
    });
    popupControls.close();
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Confirm Transaction</p>
  <Send
    asset={context.selectedAsset}
    amount={context.amount}
    receiverAddress={context.selectedAddress}
    textButton="Send CRC"
    on:select={handleSend}
  />
</FlowDecoration>
