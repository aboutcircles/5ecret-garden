import { openStep } from '$lib/shared/flow';
import type { Address } from '@circles-sdk/utils';
import PickAccounts from './1_PickAccounts.svelte';
import type { AddTrustFlowContext } from './context';

export function openAddTrustFlow(params: {
  context: AddTrustFlowContext;
  onCompleted?: (addresses: Address[]) => void | Promise<void>;
}): void {
  const context: AddTrustFlowContext = {
    ...params.context,
    mode: params.context.mode ?? 'single',
  };

  openStep({
    title: 'Add trust',
    component: PickAccounts,
    props: { ...params, context },
    key: `add-trust:${context.actorType}:${context.actorAddress}`,
  });
}
