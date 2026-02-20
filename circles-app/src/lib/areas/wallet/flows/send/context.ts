import type { TokenBalance } from '@aboutcircles/sdk-types';
import type { Address } from '@aboutcircles/sdk-types';

export type SendFlowDataType = 'hex' | 'utf-8';

export type SendFlowContext = {
  dataType?: SendFlowDataType;
  data?: string;
  selectedAddress: Address | undefined;
  transitiveOnly: boolean;
  selectedAsset: TokenBalance;
  fromTokens?: Address[];
  toTokens?: Address[];
  excludeFromTokens?: Address[];
  excludeToTokens?: Address[];
  useWrappedBalances?: boolean;
  amount: number | undefined;
  maxTransfers?: number;
};
