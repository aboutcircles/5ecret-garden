import Send from './1_To.svelte';
import AmountStep from './3_Amount.svelte';
import { SEND_POPUP_TITLE } from './constants';
import type { SendFlowContext } from './context';
import { createSendFlowContext } from './sendFlowContext.svelte';
import { openStep } from '$lib/shared/flow';

export function openSendFlowPopup(
  context: Partial<SendFlowContext> = {},
  title = SEND_POPUP_TITLE
): void {
  const flowContext = createSendFlowContext(context);
  const shouldStartAtAmount = Boolean(flowContext.selectedAddress);

  openStep({
    title,
    component: shouldStartAtAmount ? AmountStep : Send,
    props: {
      context: flowContext,
    },
  });
}
