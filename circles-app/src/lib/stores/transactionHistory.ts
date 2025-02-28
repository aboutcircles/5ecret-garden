import { avatar } from "$lib/stores/avatar";
import { type CirclesEventType, type TransactionHistoryRow } from "@circles-sdk/data";
import { get } from "svelte/store";
import { createCirclesQueryStore } from "$lib/stores/query/circlesQueryStore";

const transferEvents: Set<CirclesEventType> = new Set([
    "CrcV1_HubTransfer",
    "CrcV1_Transfer",
    "CrcV2_TransferSingle",
    "CrcV2_TransferBatch",
    "CrcV2_Erc20WrapperTransfer",
    "CrcV2_DepositInflationary",
    "CrcV2_DepositDemurraged",
    "CrcV2_WithdrawInflationary",
    "CrcV2_WithdrawDemurraged",
    "CrcV2_GroupMintSingle",
    "CrcV2_GroupMintBatch",
    "CrcV2_GroupRedeem",
    "CrcV2_GroupRedeemCollateralReturn",
    "CrcV2_GroupRedeemCollateralBurn"
] as CirclesEventType[]);

/**
 * Transaction history store, updated when relevant events occur.
 */
export const createTransactionHistory = async () => {
    const _avatar = get(avatar);

    if (!_avatar) {
        throw new Error("Avatar instance not found");
    }

    return await createCirclesQueryStore<TransactionHistoryRow>(
        () => _avatar.getTransactionHistory(25),
        transferEvents
    );
};
