import { FetchHttpTransport, type HttpTransport } from './http';
import { InMemoryAuthContext, type AuthContext } from './authContext';
import { AuthClientImpl, type AuthClient } from './auth';
import { SignersClientImpl, type SignersClient } from './signers';
import { OrdersClientImpl, type OrdersClient } from './orders';
import { CartClientImpl, type CartClient } from './cart';
import { OffersClientImpl, type OffersClient } from './offers';
import type { ProfilesBindings } from './offers';
import { CatalogClientImpl, type CatalogClient } from './catalog';

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
export class CirclesClient {
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

  /** Catalog browsing client. */
  readonly catalog: CatalogClient;

  constructor(opts: CirclesClientOptions) {
    this.marketApiBase = opts.marketApiBase.replace(/\/$/, '');
    this.http = opts.http ?? new FetchHttpTransport();
    this.authContext = opts.authContext ?? new InMemoryAuthContext();

    this.signers = new SignersClientImpl();
    this.auth = new AuthClientImpl(this.marketApiBase, this.http, this.authContext, this.signers);
    this.orders = new OrdersClientImpl(this.marketApiBase, this.http, this.authContext);
    this.cart = new CartClientImpl(this.marketApiBase, this.http, this.authContext);
    this.offers = opts.profilesBindings ? new OffersClientImpl(opts.profilesBindings) : undefined;

    this.catalog = new CatalogClientImpl(this.marketApiBase);
  }
}
