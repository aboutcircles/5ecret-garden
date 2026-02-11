import Send from './1_To.svelte';
import type { SendFlowContext } from './context';
import { transitiveTransfer } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
import { openFlowPopup } from '$lib/shared/state/popup';

export function openSendFlowPopup(
  context: Partial<SendFlowContext> = {},
  title = 'Send Circles'
): void {
  openFlowPopup({
    title,
    component: Send,
    props: {
      context: {
        selectedAsset: transitiveTransfer(),
        selectedAddress: undefined,
        amount: undefined,
        transitiveOnly: true,
        ...context,
      },
    },
  });
}
