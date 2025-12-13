export interface BasketItemInput {
    seller: string;
    sku: string;
    quantity: number;
    imageUrl?: string;
}
export interface PostalAddressInput {
    streetAddress?: string;
    addressLocality?: string;
    postalCode?: string;
    addressCountry?: string;
}
export interface ContactPointInput {
    email?: string;
    telephone?: string;
}
export interface PersonMinimalInput {
    birthDate?: string;
}
export interface Basket {
    basketId: string;
    buyer?: string;
    operator?: string;
    chainId: number;
    items: BasketItemInput[];
    status: string;
    [k: string]: unknown;
}
export interface ValidationResult {
    valid: boolean;
    requirements: any[];
    missing: any[];
    ruleTrace: any[];
}
//# sourceMappingURL=cartTypes.d.ts.map