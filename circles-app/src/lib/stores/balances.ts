import {get, derived} from "svelte/store";
import {avatar} from "$lib/stores/avatar";
import type {CirclesEvent, CirclesEventType, TokenBalanceRow} from "@circles-sdk/data";

let setBalances: (balances: {
    total: {
        attoCircles: string;
        circles: number;
    },
    rows: TokenBalanceRow[]
}) => void;

/**
 * A store that contains the token balances of the current avatar.
 * The balances are updated whenever relevant balance-related events occur.
 */
export const balances = derived<typeof avatar, {
    total: {
        attoCircles: string;
        circles: number;
    },
    rows: TokenBalanceRow[]
}>(
    avatar,
    ($avatar, set) => {
        setBalances = set;
        set({
            total: {
                attoCircles: "0",
                circles: 0
            },
            rows: []
        });

        if (!$avatar) {
            return;
        }

        const handleEvent = async (event: CirclesEvent) => {
            const balanceEvents: CirclesEventType[] = [
                "CrcV2_TransferBatch",
                "CrcV2_TransferSingle",
                "CrcV1_HubTransfer",
                "CrcV2_Erc20WrapperTransfer",
                "CrcV1_Transfer"
            ];
            if (!balanceEvents.includes(event.$event)) {
                return;
            }

            try {
                await updateBalances();
            } catch (e) {
                console.error(`Failed to update balances on event ${event.$event}`, e);
            }
        };

        updateBalances()
            .then(() => $avatar.events.subscribe(handleEvent))
            .catch(e => console.error("Failed to initialize balances store", e));

        return () => {
            $avatar.unsubscribeFromEvents();
        };
    }
);

async function updateBalances() {
    const avatarInstance = get(avatar);
    if (!avatarInstance) {
        return;
    }

    try {
        // Fetch the token balances
        const balanceData: TokenBalanceRow[] = await avatarInstance.getBalances();
        setBalances({
            total: {
                circles: balanceData.reduce((total, row) => total + row.circles, 0),
                attoCircles: balanceData.reduce((total, row) => total + BigInt(row.attoCircles), BigInt(0)).toString()
            },
            rows: balanceData
        });
    } catch (error) {
        console.error("Error fetching balances:", error);
        setBalances({
            total: {
                attoCircles: "0",
                circles: 0
            },
            rows: []
        });
    }
}
