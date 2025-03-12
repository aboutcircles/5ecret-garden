import type { TokenBalanceRow } from '@circles-sdk/data';
import type { Address } from '@circles-sdk/utils';

export type GroupMintFlowContext = {
  selectedAddress: Address | undefined;
  selectedAsset: TokenBalanceRow;
  amount: number | undefined;
};
