import type {TokenBalanceRow} from "@circles-sdk/data";

export type SendFlowContext = {
    selectedAddress: string | undefined;
    selectedAsset: TokenBalanceRow | undefined;
    amount: number | undefined;
};