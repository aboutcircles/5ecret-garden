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

    let dataUInt8Arr: Uint8Array<ArrayBufferLike> = new Uint8Array(0);

    // If user provided data
    if (context.data && context.data.trim().length > 0) {
      if (context.dataType === 'hex') {
        // Trim it, remove optional "0x", and validate
        let hexString = context.data.trim();
        if (hexString.startsWith('0x')) {
          hexString = hexString.slice(2);
        }
        if (!/^[0-9A-Fa-f]*$/.test(hexString)) {
          throw new Error('Invalid hex string provided');
        }
        // Convert to Uint8Array
        const pairs = hexString.match(/.{1,2}/g) ?? [];
        dataUInt8Arr = new Uint8Array(
          pairs.map((byte) => parseInt(byte, 16)),
        );
      } else {
        // Default to UTF-8
        dataUInt8Arr = new TextEncoder().encode(context.data);
      }
    }

    runTask({
      name: `Send ${roundToDecimals(context.amount)} ${tokenTypeToString(context.selectedAsset.tokenType)} to ${shortenAddress(context.selectedAddress)}...`,
      promise:
        context.selectedAsset.tokenAddress === TransitiveTransferTokenAddress
          ? $avatar.transfer(context.selectedAddress, context.amount)
          : $avatar.transfer(
            context.selectedAddress,
            context.amount,
            context.selectedAsset.tokenAddress,
            dataUInt8Arr,
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
    data={context.data}
    dataType={context.dataType}
    on:select={handleSend}
  />
</FlowDecoration>
