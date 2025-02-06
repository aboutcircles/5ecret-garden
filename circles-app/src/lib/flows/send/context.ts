import type {TokenBalanceRow} from "@circles-sdk/data";

export type SendFlowContext = {
    selectedAddress: string;
    transitiveOnly: boolean;
    selectedAsset: TokenBalanceRow;
    amount: number | undefined;
};