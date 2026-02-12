<script lang="ts">
  import Send from '$lib/areas/wallet/ui/pages/Send.svelte';
  import type {SendFlowContext} from '$lib/areas/wallet/flows/send/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import {runTask} from '$lib/shared/utils/tasks';
  import {roundToDecimals, shortenAddress} from '$lib/shared/utils/shared';
  import {avatarState} from '$lib/shared/state/avatar.svelte';
  import {tokenTypeToString, TransitiveTransferTokenAddress} from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import {popupControls} from '$lib/shared/state/popup';
  import {MAX_PATH_STEPS} from "$lib/shared/config/circles";
  import {
    requireAmount,
    requireAvatar,
    requireSelectedAsset,
    requireWalletAddress,
  } from '$lib/shared/flow/guards';
  import type { ReviewStepProps } from '$lib/shared/flow/contracts';

  type Props = ReviewStepProps<SendFlowContext>;

  let {context}: Props = $props();

  function onselect() {
    const avatar = requireAvatar(avatarState.avatar);
    const selectedAddress = requireWalletAddress(context.selectedAddress, 'No address selected');
    const selectedAsset = requireSelectedAsset(context, 'No asset selected');
    const amount = requireAmount(context.amount, 'No amount specified');

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
        // Ensure even-length hex; pad leading 0 if odd-length
        if (hexString.length % 2 === 1) {
          hexString = '0' + hexString;
        }
        // Convert to Uint8Array
        const pairs = hexString.match(/.{2}/g) ?? [];
        dataUInt8Arr = new Uint8Array(
          pairs.map((byte) => parseInt(byte, 16)),
        );
      } else {
        // Default to UTF-8
        dataUInt8Arr = new TextEncoder().encode(context.data);
      }
    }

    // let amountToSend: bigint = context.selectedAsset.version === 1
    //   ? tcToCrc(new Date(), context.amount)
    //   : parseEther(context.amount.toString());

    runTask({
      name: `Send ${roundToDecimals(amount)} ${tokenTypeToString(selectedAsset.tokenType)} to ${shortenAddress(selectedAddress)}...`,
      promise:
        selectedAsset.tokenAddress === TransitiveTransferTokenAddress
          ? avatar.transfer(
            selectedAddress,
            amount,
            undefined,
            dataUInt8Arr,
            true,
            undefined,
            undefined,
            undefined,
            undefined,
             context.maxTransfers ?? MAX_PATH_STEPS)
          : avatar.transfer(
            selectedAddress,
            amount,
            // amountToSend,
            selectedAsset.tokenAddress,
            dataUInt8Arr,
            true,
            undefined,
            undefined,
            undefined,
            undefined,
            context.maxTransfers ?? MAX_PATH_STEPS
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
