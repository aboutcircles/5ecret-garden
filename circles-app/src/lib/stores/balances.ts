import {writable} from "svelte/store";
import type {TokenBalanceRow} from "@circles-sdk/data";

export const balances = writable<TokenBalanceRow[]>();