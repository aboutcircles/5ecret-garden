import type { TokenBalanceRow } from '@circles-sdk/data';
import type { Address } from '@circles-sdk/utils';

export type SendFlowDataType = 'hex' | 'utf-8';

export type SendFlowContext = {
  dataType?: SendFlowDataType;
  data?: string;
  selectedAddress: Address | undefined;
  transitiveOnly: boolean;
  selectedAsset: TokenBalanceRow;
  amount: number | undefined;
};
