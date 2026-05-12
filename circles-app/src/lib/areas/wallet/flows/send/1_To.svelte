<script lang="ts">
  import SelectAmount from './3_Amount.svelte';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openStep } from '$lib/shared/flow';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { get } from 'svelte/store';
  import type { SelectTargetStepProps } from '$lib/shared/flow';
  import { SEND_FLOW_SCAFFOLD_BASE, SEND_POPUP_TITLE } from './constants';
  import {
    requireAvatar,
    requireCircles,
    requireWalletAddress,
  } from '$lib/shared/flow';

  type Props = Partial<SelectTargetStepProps<SendFlowContext>>;

  let {
    context = $bindable({
      selectedAddress: undefined,
      transitiveOnly: false,
      selectedAsset: undefined,
      amount: undefined,
    }),
  }: Props = $props();

  async function onselect(selectedAvatar: Address) {
    context.selectedAddress = selectedAvatar;

    try {
      requireCircles(get(circles));
      requireAvatar(avatarState.avatar);
      requireWalletAddress(context.selectedAddress, 'No address selected');
    } catch {
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
  className="w-full"
  step={1}
  title="Recipient"
  tabindex="-1"
  data-send-step-initial-focus
>
  <div class="w-full">
    <SearchAvatar
      avatarTypes={["CrcV2_RegisterHuman","CrcV2_RegisterOrganization"]}
      selectedAddress={context.selectedAddress}
      inputDataAttribute="data-send-step-initial-input data-send-recipient-search-input"
      {onselect}
      searchType="send"
    />
  </div>
</FlowStepScaffold>
