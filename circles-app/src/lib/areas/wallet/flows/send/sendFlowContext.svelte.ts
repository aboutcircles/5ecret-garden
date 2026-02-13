import type { SendFlowContext } from './context';
import { transitiveTransfer } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';

class SendFlowContextState implements SendFlowContext {
  selectedAsset = $state(transitiveTransfer());
  selectedAddress = $state<SendFlowContext['selectedAddress']>(undefined);
  amount = $state<SendFlowContext['amount']>(undefined);
  transitiveOnly = $state(true);
  data = $state<SendFlowContext['data']>(undefined);
  dataType = $state<SendFlowContext['dataType']>(undefined);
  maxTransfers = $state<SendFlowContext['maxTransfers']>(undefined);

  constructor(overrides: Partial<SendFlowContext> = {}) {
    if (overrides.selectedAsset !== undefined) {
      this.selectedAsset = overrides.selectedAsset;
    }
    if ('selectedAddress' in overrides) {
      this.selectedAddress = overrides.selectedAddress;
    }
    if ('amount' in overrides) {
      this.amount = overrides.amount;
    }
    if ('transitiveOnly' in overrides) {
      this.transitiveOnly = overrides.transitiveOnly ?? true;
    }
    if ('data' in overrides) {
      this.data = overrides.data;
    }
    if ('dataType' in overrides) {
      this.dataType = overrides.dataType;
    }
    if ('maxTransfers' in overrides) {
      this.maxTransfers = overrides.maxTransfers;
    }
  }
}

export function createSendFlowContext(
  overrides: Partial<SendFlowContext> = {}
): SendFlowContext {
  return new SendFlowContextState(overrides);
}