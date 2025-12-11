export interface BasketItemInput {
  seller: string; // 0x...
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
  birthDate?: string; // ISO date
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
