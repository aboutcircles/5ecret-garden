import type {TokenBalanceRow} from "@circles-sdk/data";

export type GroupMintFlowContext = {
    selectedAddress: string;
    selectedAsset: TokenBalanceRow;
    amount: number | undefined;
};