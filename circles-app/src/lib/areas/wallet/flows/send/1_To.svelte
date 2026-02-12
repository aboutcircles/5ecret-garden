<script lang="ts">
  import SelectAsset from './2_Asset.svelte';
  import SelectAmount from './3_Amount.svelte';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openStep } from '$lib/shared/flow/runtime';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { get } from 'svelte/store';
  import type { SelectTargetStepProps } from '$lib/shared/flow/contracts';
  import {
    requireAvatar,
    requireCircles,
    requireWalletAddress,
  } from '$lib/shared/flow/guards';

  type Props = Partial<SelectTargetStepProps<SendFlowContext>>;

  let {
    context = $bindable({
      selectedAddress: undefined,
      transitiveOnly: false,
      selectedAsset: undefined as any,
      amount: undefined,
    }),
  }: Props = $props();

  $effect(() => {
    if (context.selectedAddress && context.selectedAsset) {
      openStep({
        title: 'Enter Amount',
        component: SelectAmount,
        props: {
          context: context,
        },
      });
    }
  });

  async function onselect(selectedAvatar: Address) {
    context.selectedAddress = selectedAvatar;

    try {
      requireCircles(get(circles));
      requireAvatar(avatarState.avatar);
      requireWalletAddress(context.selectedAddress, 'No address selected');
    } catch {
      return;
    }

    if (context.selectedAsset) {
      openStep({
        title: 'Enter Amount',
        component: SelectAmount,
        props: {
          context: context,
        },
      });
    } else {
      openStep({
        title: 'Select Asset',
        component: SelectAsset,
        props: {
          context: context,
        },
      });
    }
  }
</script>

<FlowDecoration>
  <SearchAvatar
    avatarTypes={["CrcV2_RegisterHuman","CrcV2_RegisterOrganization"]}
    selectedAddress={context.selectedAddress}
    {onselect}
    searchType="send"
  />
</FlowDecoration>
