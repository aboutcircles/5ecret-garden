import { FetchHttpTransport } from './http';
import { InMemoryAuthContext } from './authContext';
import { AuthClientImpl } from './auth';
import { SignersClientImpl } from './signers';
import { OrdersClientImpl } from './orders';
import { CartClientImpl } from './cart';
import { OffersClientImpl } from './offers';
/** Top-level entry point to the Circles Market SDK. */
export class CirclesClient {
    constructor(opts) {
        this.marketApiBase = opts.marketApiBase.replace(/\/$/, '');
        this.http = opts.http ?? new FetchHttpTransport();
        this.authContext = opts.authContext ?? new InMemoryAuthContext();
        this.signers = new SignersClientImpl();
        this.auth = new AuthClientImpl(this.marketApiBase, this.http, this.authContext, this.signers);
        this.orders = new OrdersClientImpl(this.marketApiBase, this.http, this.authContext);
        this.cart = new CartClientImpl(this.marketApiBase, this.http, this.authContext);
        this.offers = opts.profilesBindings ? new OffersClientImpl(opts.profilesBindings) : undefined;
    }
}
