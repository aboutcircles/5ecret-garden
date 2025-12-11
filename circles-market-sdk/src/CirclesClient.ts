import { FetchHttpTransport, type HttpTransport } from './http';
import { InMemoryAuthContext, type AuthContext } from './authContext';
import { AuthClientImpl, type AuthClient } from './auth';
import { SignersClientImpl, type SignersClient } from './signers';
import { OrdersClientImpl, type OrdersClient } from './orders';

export interface CirclesClientOptions {
  /** Base URL of the Circles Market API, e.g. https://market.aboutcircles.com */
  marketApiBase: string;
  /** Optional custom HTTP transport (defaults to FetchHttpTransport). */
  http?: HttpTransport;
  /** Optional custom AuthContext (defaults to in-memory implementation). */
  authContext?: AuthContext;
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

  constructor(opts: CirclesClientOptions) {
    this.marketApiBase = opts.marketApiBase.replace(/\/$/, '');
    this.http = opts.http ?? new FetchHttpTransport();
    this.authContext = opts.authContext ?? new InMemoryAuthContext();

    this.signers = new SignersClientImpl();
    this.auth = new AuthClientImpl(this.marketApiBase, this.http, this.authContext, this.signers);
    this.orders = new OrdersClientImpl(this.marketApiBase, this.http, this.authContext);
  }
}
