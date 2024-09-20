import type {TokenBalanceRow} from "@circles-sdk/data";

export type GroupMintFlowContext = {
    selectedAddress: string | undefined;
    selectedAsset: TokenBalanceRow | undefined;
    amount: number | undefined;
};