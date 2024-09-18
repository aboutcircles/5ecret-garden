import {redirect} from "@sveltejs/kit";
import {wallet} from "$lib/stores/wallet";
import {get} from "svelte/store";

export const load = (params): void => {
    // Redirect to 'connect wallet' if not connected
    if (params.route.id !== '/_new/connect-wallet'
        && params.route.id !== '/_new/connect-wallet/connect-cometh'
        && params.route.id !== '/_new/connect-wallet/connect-metamask'
        && params.route.id !== '/_new/connect-wallet/connect-safe'
        && params.route.id !== '/'
        && get(wallet) === undefined) {
        redirect(302, '/_new/connect-wallet');
    }
};
