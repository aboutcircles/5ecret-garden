import { writable, derived } from 'svelte/store';
import { ethers, type Contract, type ContractRunner } from 'ethers6';
import coreMemberGroupABI from '$lib/utils/abi/CoreMemberGroup';
import { wallet } from '$lib/stores/wallet';

const CMG_ADDRESS = '0x55785b41703728f1F1F05E77e22B13c3FCc9ce65';

export const contract = writable<Contract | null>(null);

export const CMGContract = derived(
    wallet,
    ($wallet, set) => {
        if ($wallet) {
            const cmgContract = new ethers.Contract(CMG_ADDRESS, coreMemberGroupABI, $wallet as ContractRunner);
            set(cmgContract);
        } else {
            set(null);
        }
    },
    null as Contract | null
);
