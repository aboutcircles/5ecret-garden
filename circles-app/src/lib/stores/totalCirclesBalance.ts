// a derived store that sums up all .circles circlesBalances in the circlesBalances store and returns it as eth formatted number
import { circlesBalances } from '$lib/stores/circlesBalances';
import { derived } from 'svelte/store';

export const totalCirclesBalance = derived(circlesBalances, ($balances) => {
  return $balances.data.reduce((acc, balance) => acc + balance.circles, 0);
});
