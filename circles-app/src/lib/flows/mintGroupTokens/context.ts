import type { TokenBalanceRow } from '@circles-sdk/data';

export type GroupMintFlowContext = {
  selectedAddress: `0x${string}`;
  selectedAsset: TokenBalanceRow;
  amount: number | undefined;
};
