export interface MinimalProductInput {
    sku: string;
    name: string;
    description?: string;
    image?: string | string[];
    url?: string;
    brand?: string;
    mpn?: string;
    gtin13?: string;
    category?: string;
}
export interface MinimalOfferInput {
    price: number;
    priceCurrency: string;
    url?: string;
    availabilityFeed?: string;
    inventoryFeed?: string;
    availableDeliveryMethod?: string;
    requiredSlots?: string[];
    fulfillmentEndpoint?: string;
    fulfillmentTrigger?: 'confirmed' | 'finalized';
}
//# sourceMappingURL=offersTypes.d.ts.map