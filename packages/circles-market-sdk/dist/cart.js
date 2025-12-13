export class CartClientImpl {
    constructor(marketApiBase, http, authContext) {
        this.marketApiBase = marketApiBase;
        this.http = http;
        this.authContext = authContext;
    }
    maybeAuthHeaders() {
        const token = this.authContext.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    async createBasket(opts) {
        const body = {
            buyer: opts.buyer,
            operator: opts.operator,
            chainId: opts.chainId ?? 100,
        };
        const res = await this.http.request({
            method: 'POST',
            url: `${this.marketApiBase}/api/cart/v1/baskets`,
            headers: { ...this.maybeAuthHeaders() },
            body,
        });
        return res;
    }
    async setItems(opts) {
        const items = opts.items.map((i) => ({
            seller: i.seller,
            orderedItem: { '@type': 'Product', sku: i.sku },
            orderQuantity: i.quantity,
            imageUrl: i.imageUrl,
        }));
        return await this.http.request({
            method: 'PATCH',
            url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}`,
            headers: { ...this.maybeAuthHeaders() },
            body: { items },
        });
    }
    async setCheckoutDetails(opts) {
        const body = {};
        if (opts.shippingAddress)
            body.shippingAddress = toPostal(opts.shippingAddress);
        if (opts.billingAddress)
            body.billingAddress = toPostal(opts.billingAddress);
        if (opts.contactPoint)
            body.contactPoint = toContact(opts.contactPoint);
        if (opts.ageProof)
            body.ageProof = toPerson(opts.ageProof);
        return await this.http.request({
            method: 'PATCH',
            url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}`,
            headers: { ...this.maybeAuthHeaders() },
            body,
        });
    }
    async validateBasket(basketId) {
        return await this.http.request({
            method: 'POST',
            url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/validate`,
            headers: { ...this.maybeAuthHeaders() },
        });
    }
    async previewOrder(basketId) {
        return await this.http.request({
            method: 'POST',
            url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/preview`,
            headers: { ...this.maybeAuthHeaders() },
        });
    }
    async checkoutBasket(opts) {
        return await this.http.request({
            method: 'POST',
            url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}/checkout`,
            headers: { ...this.maybeAuthHeaders() },
            body: opts.buyer ? { buyer: opts.buyer } : undefined,
        });
    }
}
function toPostal(a) {
    return {
        '@type': 'PostalAddress',
        ...a,
    };
}
function toContact(c) {
    return {
        '@type': 'ContactPoint',
        ...c,
    };
}
function toPerson(p) {
    return {
        '@type': 'Person',
        ...p,
    };
}
