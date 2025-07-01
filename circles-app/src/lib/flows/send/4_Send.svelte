<script lang="ts">
  import Send from '$lib/pages/Send.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { roundToDecimals, shortenAddress } from '$lib/utils/shared';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { tokenTypeToString, TransitiveTransferTokenAddress } from '$lib/pages/SelectAsset.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import { tcToCrc } from '@circles-sdk/utils';
  import { parseEther } from 'ethers';

  interface Props {
    context: SendFlowContext;
  }

  let { context }: Props = $props();

  function onselect() {
    if (!avatarState.avatar) {
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

    let amountToSend: bigint = context.selectedAsset.version === 1
      ? tcToCrc(new Date(), context.amount)
      : parseEther(context.amount.toString());

    runTask({
      name: `Send ${roundToDecimals(context.amount)} ${tokenTypeToString(context.selectedAsset.tokenType)} to ${shortenAddress(context.selectedAddress)}...`,
      promise:
        context.selectedAsset.tokenAddress === TransitiveTransferTokenAddress
          ? avatarState.avatar.transfer(context.selectedAddress, context.amount, undefined, dataUInt8Arr, true)
          : avatarState.avatar.transfer(
            context.selectedAddress,
            amountToSend,
            context.selectedAsset.tokenAddress,
            dataUInt8Arr,
            true
          ),
    });

    popupControls.close();
  }
</script>

<FlowDecoration>
  <Send
    asset={context.selectedAsset}
    amount={context.amount}
    receiverAddress={context.selectedAddress}
    textButton="Send CRC"
    data={context.data}
    dataType={context.dataType}
    {onselect}
  />
</FlowDecoration>
