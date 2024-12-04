import {redirect} from "@sveltejs/kit";
import {wallet} from "$lib/stores/wallet";
import {get} from "svelte/store";

export const load = (params): void => {
    // Redirect to 'connect wallet' if not connected
    if (params.route.id !== '/connect-wallet'
        && params.route.id !== '/connect-wallet/connect-cometh'
        && params.route.id !== '/connect-wallet/connect-metamask'
        && params.route.id !== '/connect-wallet/connect-safe'
        && params.route.id !== '/connect-wallet/import-circles-garden'
        && params.route.id !== '/'
        && get(wallet) === undefined) {
        // redirect(302, '/connect-wallet');
    }
};
