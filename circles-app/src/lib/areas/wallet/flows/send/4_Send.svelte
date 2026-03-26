<script lang="ts">
  import Send from '$lib/areas/wallet/ui/pages/Send.svelte';
  import ToStep from './1_To.svelte';
  import TokenFiltersStep from './2_TokenFilters.svelte';
  import AmountStep from './3_Amount.svelte';
  import type {SendFlowContext} from '$lib/areas/wallet/flows/send/context';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { SEND_FLOW_SCAFFOLD_BASE } from './constants';
  import { openStep, popToOrOpen, useAsyncAction } from '$lib/shared/flow';
  import { executeTxConfirmFirst } from '$lib/shared/utils/txExecution';
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
  } from '$lib/shared/flow';
  import type { ReviewStepProps } from '$lib/shared/flow';
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
    if (!hasAsset) return 'Select routing settings before sending.';
    if (!hasAmount) return 'Enter an amount greater than 0 before sending.';
    return null;
  });

  const sendAction = useAsyncAction(async () => {
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

    await executeTxConfirmFirst({
      name: `Send ${roundToDecimals(amount)} ${tokenTypeToString(selectedAsset.tokenType)} to ${shortenAddress(selectedAddress)}...`,
      submit: () =>
        selectedAsset.tokenAddress === TransitiveTransferTokenAddress
          ? avatar.transfer(
              selectedAddress,
              amount,
              undefined,
              dataUInt8Arr,
              context.useWrappedBalances ?? true,
              context.fromTokens,
              context.toTokens,
              context.excludeFromTokens,
              context.excludeToTokens,
              context.maxTransfers ?? MAX_PATH_STEPS,
            )
          : avatar.transfer(
              selectedAddress,
              amount,
              selectedAsset.tokenAddress,
              dataUInt8Arr,
              context.useWrappedBalances ?? true,
              context.fromTokens,
              context.toTokens,
              context.excludeFromTokens,
              context.excludeToTokens,
              context.maxTransfers ?? MAX_PATH_STEPS,
            ),
      onSuccess: () => {
        popupControls.close();
      },
    });
  });

  function onselect() {
    void sendAction.run();
  }

  function editTo() {
    context.selectedAddress = undefined;
    popToOrOpen(ToStep, {
      title: SEND_POPUP_TITLE,
      props: { context },
    });
  }

  function editRoute() {
    if (!context.transitiveOnly) {
      popToOrOpen(AmountStep, {
        title: SEND_POPUP_TITLE,
        props: { context },
      });
      return;
    }

    popToOrOpen(AmountStep, {
      title: SEND_POPUP_TITLE,
      props: { context },
    });

    openStep({
      title: SEND_POPUP_TITLE,
      component: TokenFiltersStep,
      props: { context, returnMode: 'back' },
    });
  }

  function editAmount() {
    popToOrOpen(AmountStep, {
      title: SEND_POPUP_TITLE,
      props: { context },
    });
  }
</script>

<FlowStepScaffold
  {...SEND_FLOW_SCAFFOLD_BASE}
  step={3}
  title="Review"
  tabindex="-1"
  data-send-step-initial-focus
>
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
        submitDisabled={!canContinue || sendAction.loading}
        {validationMessage}
        {onselect}
    />
    {#if sendAction.error}
        <StepAlert variant="error" className="mt-2" message={sendAction.error} />
    {/if}
  </FlowStepScaffold>
