import { type HttpTransport } from './http';
import { type AuthContext } from './authContext';
import { type AuthClient } from './auth';
import { type SignersClient } from './signers';
import { type OrdersClient } from './orders';
import { type CartClient } from './cart';
import { type OffersClient } from './offers';
import type { ProfilesBindings } from './offers';
export interface CirclesClientOptions {
    /** Base URL of the Circles Market API, e.g. https://market.aboutcircles.com */
    marketApiBase: string;
    /** Optional custom HTTP transport (defaults to FetchHttpTransport). */
    http?: HttpTransport;
    /** Optional custom AuthContext (defaults to in-memory implementation). */
    authContext?: AuthContext;
    /** Optional bindings for Profiles/IPFS to enable offers publishing. */
    profilesBindings?: ProfilesBindings;
}
/** Top-level entry point to the Circles Market SDK. */
export declare class CirclesClient {
    readonly marketApiBase: string;
    readonly http: HttpTransport;
    readonly authContext: AuthContext;
    /** Wallet/signature helpers (Safe EIP-712 signing, etc.). */
    readonly signers: SignersClient;
    /** Authentication (Safe-based SIWE). */
    readonly auth: AuthClient;
    /** Buyer-scoped order operations and SSE events. */
    readonly orders: OrdersClient;
    /** Basket/cart operations. */
    readonly cart: CartClient;
    /** Offers publishing operations (requires profiles bindings). */
    readonly offers?: OffersClient;
    constructor(opts: CirclesClientOptions);
}
//# sourceMappingURL=CirclesClient.d.ts.map