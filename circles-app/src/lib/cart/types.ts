import type { Address } from '@circles-sdk/utils';

export type BasketStatus =
  | 'Draft'
  | 'Validating'
  | 'Valid'
  | 'CheckedOut'
  | 'Expired';

export type Basket = {
  '@context': string[]; // ["https://schema.org/","https://aboutcircles.com/contexts/circles-market/"]
  '@type': 'circles:Basket';
  basketId: string;
  buyer: Address | null;
  operator: Address | null;
  chainId: number;
  status: BasketStatus;

  items: OrderItemPreview[];

  shippingAddress?: PostalAddress;
  billingAddress?: PostalAddress;
  ageProof?: PersonMinimal;
  contactPoint?: ContactPoint;

  createdAt: number; // unix seconds
  modifiedAt: number; // unix seconds
  ttlSeconds: number;
};

export type OrderItemPreview = {
  '@type': 'OrderItem';
  orderQuantity: number;
  orderedItem: OrderedItemRef;
  seller?: Address;
  productCid?: string;
  offerSnapshot?: OfferSnapshot | null;
};

export type OrderedItemRef = {
  '@type': 'Product';
  sku: string;
};

export type OfferSnapshot = {
  '@type': 'Offer';
  price?: number | null;
  priceCurrency?: string | null;
  seller?: SchemaOrgOrgId | null;
  checkoutPageURLTemplate?: string | null;
};

export type SchemaOrgOrgId = {
  '@type': 'Organization';
  '@id': string | null; // eip155:chainId:address
};

export type PostalAddress = {
  '@type': 'PostalAddress';
  streetAddress?: string | null;
  addressLocality?: string | null;
  postalCode?: string | null;
  addressCountry?: string | null;
};

export type PersonMinimal = {
  '@type': 'Person';
  birthDate?: string | null; // ISO date
};

export type ContactPoint = {
  '@type': 'ContactPoint';
  email?: string | null;
  telephone?: string | null;
};

export type BasketCreateRequest = {
  operator?: Address;
  buyer?: Address;
  chainId?: number;
};

export type BasketCreateResponse = {
  '@type': 'circles:Basket';
  basketId: string;
};

export type Cardinality = {
  min: number;
  max: number;
};

export type ValidationRequirementStatus =
  | 'ok'
  | 'missing'
  | 'typeMismatch'
  | 'invalidShape';

export type ValidationRequirement = {
  id: string;
  ruleId: string;
  reason?: string | null;
  slot: string;
  path: string;
  expectedTypes: string[];
  cardinality: Cardinality;
  status: ValidationRequirementStatus;
  foundAt?: string | null;
  foundType?: string | null;
};

export type RuleTrace = {
  id: string;
  evaluated: boolean;
  result: ValidationRequirementStatus | string;
};

export type MissingSlot = {
  slot: string;
  path: string;
  expectedTypes: string[];
};

export type ValidationResult = {
  '@context': string; // "https://schema.org/"
  '@type': string; // "Thing"
  basketId: string;
  valid: boolean;
  requirements: ValidationRequirement[];
  missing: MissingSlot[];
  ruleTrace: RuleTrace[];
};

export type OrderSnapshot = {
  '@context': string; // "https://schema.org/"
  '@type': 'Order';
  orderNumber: string;
  orderStatus: string;
  customer: SchemaOrgPersonId;
  broker: SchemaOrgOrgId;
  acceptedOffer: OfferSnapshot[];
  orderedItem: OrderItemLine[];
  billingAddress?: PostalAddress | null;
  shippingAddress?: PostalAddress | null;
  totalPaymentDue?: PriceSpecification | null;
  paymentUrl?: string | null;
};

export type SchemaOrgPersonId = {
  '@type': 'Person';
  '@id': string | null;
};

export type PriceSpecification = {
  '@type': 'PriceSpecification';
  price?: number | null;
  priceCurrency?: string | null;
};

export type OrderItemLine = {
  '@type': 'OrderItem';
  orderQuantity: number;
  orderedItem: OrderedItemRef;
  productCid?: string | null;
};
