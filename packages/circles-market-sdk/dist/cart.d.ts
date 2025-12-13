import type { HttpTransport } from './http';
import type { AuthContext } from './authContext';
import type { Basket, BasketItemInput, PostalAddressInput, ContactPointInput, PersonMinimalInput, ValidationResult } from './cartTypes';
export interface CartClient {
    createBasket(opts: {
        buyer: string;
        operator: string;
        chainId?: number;
    }): Promise<{
        basketId: string;
    }>;
    setItems(opts: {
        basketId: string;
        items: BasketItemInput[];
    }): Promise<Basket>;
    setCheckoutDetails(opts: {
        basketId: string;
        shippingAddress?: PostalAddressInput;
        billingAddress?: PostalAddressInput;
        contactPoint?: ContactPointInput;
        ageProof?: PersonMinimalInput;
    }): Promise<Basket>;
    validateBasket(basketId: string): Promise<ValidationResult>;
    previewOrder(basketId: string): Promise<any>;
    checkoutBasket(opts: {
        basketId: string;
        buyer?: string;
    }): Promise<{
        orderId: string;
        paymentReference: string;
        basketId: string;
    }>;
}
export declare class CartClientImpl implements CartClient {
    private readonly marketApiBase;
    private readonly http;
    private readonly authContext;
    constructor(marketApiBase: string, http: HttpTransport, authContext: AuthContext);
    private maybeAuthHeaders;
    createBasket(opts: {
        buyer: string;
        operator: string;
        chainId?: number;
    }): Promise<{
        basketId: string;
    }>;
    setItems(opts: {
        basketId: string;
        items: BasketItemInput[];
    }): Promise<Basket>;
    setCheckoutDetails(opts: {
        basketId: string;
        shippingAddress?: PostalAddressInput;
        billingAddress?: PostalAddressInput;
        contactPoint?: ContactPointInput;
        ageProof?: PersonMinimalInput;
    }): Promise<Basket>;
    validateBasket(basketId: string): Promise<ValidationResult>;
    previewOrder(basketId: string): Promise<any>;
    checkoutBasket(opts: {
        basketId: string;
        buyer?: string;
    }): Promise<{
        orderId: string;
        paymentReference: string;
        basketId: string;
    }>;
}
//# sourceMappingURL=cart.d.ts.map