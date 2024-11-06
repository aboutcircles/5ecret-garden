<script lang="ts">
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import Send from '$lib/pages/Send.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { runTask } from '../../../routes/+layout.svelte';
  import { roundToDecimals, shortenAddress } from '$lib/utils/shared';
  import { avatar } from '$lib/stores/avatar';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { TransitiveTransferTokenAddress } from '$lib/pages/SelectAsset.svelte';

  export let contentApi: PopupContentApi;
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
    contentApi.close();
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold mt-14">Confirm Transaction</p>
  <Send
    asset={context.selectedAsset}
    amount={context.amount}
    receiverAddress={context.selectedAddress}
    textButton="Send CRC"
    on:select={handleSend}
  />
</FlowDecoration>
