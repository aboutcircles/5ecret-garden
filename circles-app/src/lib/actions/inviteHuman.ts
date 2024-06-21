import {avatar} from "$lib/stores/avatar";
import {get} from "svelte/store";
import {ContractTransactionReceipt} from "ethers";

export async function inviteHuman(contactAddress: string): Promise<ContractTransactionReceipt> {
    const avatarValue = get(avatar);
    if (!avatarValue) {
        throw new Error('Avatar is not initialized');
    }
    return await avatarValue.inviteHuman(contactAddress);
}