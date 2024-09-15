// a derived store that sums up all .circles balances in the balances store and returns it as eth formatted number

import {balances} from "$lib/stores/balances";
import {derived} from "svelte/store";

export const totalCirclesBalance = derived(balances, ($balances) => {
    return $balances.data.reduce((acc, balance) => acc + balance.circles, 0);
});