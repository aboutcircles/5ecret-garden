<script lang="ts">
  import Send from '$lib/areas/wallet/ui/pages/Send.svelte';
  import ToStep from './1_To.svelte';
  import RouteStep from './2_Asset.svelte';
  import AmountStep from './3_Amount.svelte';
  import type {SendFlowContext} from '$lib/areas/wallet/flows/send/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { openStep } from '$lib/shared/flow/runtime';
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
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import { SEND_POPUP_TITLE } from './constants';

  type Props = ReviewStepProps<SendFlowContext>;

  let {context}: Props = $props();

  const hasRecipient = $derived(Boolean(context.selectedAddress));
  const hasAsset = $derived(Boolean(context.selectedAsset));
  const hasAmount = $derived.by(() => {
    const amount = Number(context.amount ?? 0);
    return Number.isFinite(amount) && amount > 0;
  });

  const canContinue = $derived(hasRecipient && hasAsset && hasAmount);

  const validationMessage = $derived.by(() => {
    if (!hasRecipient) return 'Select a recipient before sending.';
    if (!hasAsset) return 'Select a route/asset before sending.';
    if (!hasAmount) return 'Enter an amount greater than 0 before sending.';
    return null;
  });

  function onselect() {
    if (!canContinue) return;

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

  function editTo() {
    context.selectedAddress = undefined;

    const didPop = popupControls.popTo((entry) => entry.component === ToStep);
    if (!didPop) {
      openStep({
        title: SEND_POPUP_TITLE,
        component: ToStep,
        props: { context },
      });
    }
  }

  function editRoute() {
    const didPopToAmount = popupControls.popTo((entry) => entry.component === AmountStep);
    if (!didPopToAmount) {
      openStep({
        title: SEND_POPUP_TITLE,
        component: AmountStep,
        props: { context },
      });
    }

    openStep({
      title: SEND_POPUP_TITLE,
      component: RouteStep,
      props: { context, returnMode: 'back' },
    });
  }

  function editAmount() {
    const didPop = popupControls.popTo((entry) => entry.component === AmountStep);
    if (!didPop) {
      openStep({
        title: SEND_POPUP_TITLE,
        component: AmountStep,
        props: { context },
      });
    }
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-send-step-initial-focus>
    <FlowStepHeader step={3} total={3} title="Review" labels={['Recipient', 'Amount', 'Review']} />
    <Send
        asset={context.selectedAsset}
        amount={context.amount}
        receiverAddress={context.selectedAddress}
        textButton="Send Circles"
        data={context.data}
        dataType={context.dataType}
        onEditTo={editTo}
        onEditRoute={editRoute}
        onEditAmount={editAmount}
        submitDisabled={!canContinue}
        {validationMessage}
        {onselect}
    />
  </div>
</FlowDecoration>
