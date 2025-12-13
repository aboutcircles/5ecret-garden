interface HttpRequestOptions {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
}
interface HttpTransport {
    request<T = unknown>(opts: HttpRequestOptions): Promise<T>;
}
declare class HttpError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly body: string;
    constructor(status: number, statusText: string, body: string);
}
declare class FetchHttpTransport implements HttpTransport {
    request<T = unknown>(opts: HttpRequestOptions): Promise<T>;
}

interface AuthContextMeta {
    address: string;
    chainId: number;
}
interface AuthContext {
    /** Returns the current JWT if valid (with a small grace window), otherwise null. */
    getToken(): string | null;
    /** Stores a new JWT along with its lifetime and associated address/chain. */
    setToken(token: string, expSeconds: number, addr: string, chainId: number): void;
    /** Clears any stored authentication token and metadata. */
    clear(): void;
    /** Returns metadata only if a valid token is present; otherwise null. */
    getMeta(): AuthContextMeta | null;
}
declare class InMemoryAuthContext implements AuthContext {
    private token;
    private exp;
    private meta;
    private expiryGraceSeconds;
    getToken(): string | null;
    setToken(token: string, expSeconds: number, addr: string, chainId: number): void;
    clear(): void;
    getMeta(): AuthContextMeta | null;
}

interface WalletProvider {
    request<T = unknown>(args: {
        method: string;
        params?: unknown[];
    }): Promise<T>;
}
interface AvatarSigner {
    avatar: string;
    chainId: bigint;
    signBytes(payload: Uint8Array): Promise<`0x${string}`>;
}
interface SignersClient {
    createSafeSignerForAvatar(opts: {
        avatar: string;
        ethereum: WalletProvider;
        chainId: bigint;
        enforceChainId?: boolean;
    }): Promise<AvatarSigner>;
}
declare class SignersClientImpl implements SignersClient {
    createSafeSignerForAvatar(opts: {
        avatar: string;
        ethereum: WalletProvider;
        chainId: bigint;
        enforceChainId?: boolean;
    }): Promise<AvatarSigner>;
}

/**
 * Authentication client for Circles Market API.
 * Handles Safe-based SIWE: requests a challenge, signs bytes via SafeMessage, and verifies to obtain a JWT.
 */
interface AuthClient {
    /**
     * Sign in using an avatar Safe address on a given chain.
     * Requires an EIP-1193 wallet provider connected to the Safe owner account.
     */
    signInWithAvatar(options: {
        /** Avatar Safe address (checksummed or lowercase). */
        avatar: string;
        /** EIP-1193 provider (e.g., window.ethereum). */
        ethereum: WalletProvider;
        /** Chain ID (defaults to 100 – Gnosis Chain). */
        chainId?: number;
    }): Promise<{
        address: string;
        chainId: number;
    }>;
    /** Clears the stored auth token and metadata. */
    signOut(): void;
    /** Returns current auth metadata if token is still valid; otherwise null. */
    getAuthMeta(): {
        address: string;
        chainId: number;
    } | null;
}
declare class AuthClientImpl implements AuthClient {
    private readonly marketApiBase;
    private readonly http;
    private readonly authContext;
    private readonly signers;
    constructor(marketApiBase: string, http: HttpTransport, authContext: AuthContext, signers: SignersClient);
    signInWithAvatar(options: {
        avatar: string;
        ethereum: WalletProvider;
        chainId?: number;
    }): Promise<{
        address: string;
        chainId: number;
    }>;
    signOut(): void;
    getAuthMeta(): {
        address: string;
        chainId: number;
    } | null;
}

/**
 * Server-provided outbox entry associated with an order.
 *
 * The backend may use either a compact `{ type, payload, createdAt }` shape or
 * a richer `{ id, source, createdAt, payload }` shape. This type is forward-compatible.
 */
interface OrderOutboxItem {
    /** Optional numeric id if provided by backend. */
    id?: number;
    /** Optional source label (e.g., "fulfillment"). */
    source?: string | null;
    /** Consumer-friendly type label (may mirror payload['@type'] or a human label). */
    type?: string;
    /** Arbitrary JSON-LD payload (e.g., links, vouchers). */
    payload: unknown;
    /** ISO timestamp when the outbox entry was created. */
    createdAt?: string;
}
/**
 * Minimal view of a schema.org Order as returned by the Market API.
 *
 * Notes:
 * - `orderStatus` is a full schema.org IRI (e.g., https://schema.org/OrderDelivered).
 * - `outbox` contains arbitrary JSON-LD payloads added by the server.
 * - Unknown fields are preserved to keep the SDK forward-compatible.
 */
interface OrderSnapshot {
    /** schema.org Order identifier like orderNumber */
    orderNumber: string;
    /** schema.org IRI like https://schema.org/OrderDelivered */
    orderStatus?: string;
    /** ISO date when the order was placed */
    orderDate?: string;
    /** Optional payment reference issued by backend for convenience */
    paymentReference?: string;
    /** Arbitrary outbox payloads (download links, vouchers, etc.) */
    outbox?: OrderOutboxItem[];
    /** Allow extra properties from backend without strict typing for forward-compat */
    [k: string]: unknown;
}
/** Payload for a single order-status change event (SSE). */
interface OrderStatusEventPayload {
    orderId: string;
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
}
/** A single entry in the status history timeline for an order. */
interface OrderStatusHistoryEvent {
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
}
/** Container for an order's status history. */
interface OrderStatusHistory {
    events: OrderStatusHistoryEvent[];
}

/**
 * High-level client for buyer-scoped order operations.
 *
 * Wraps the Market API `/api/cart/v1/orders/...` endpoints:
 * - GET `/orders/by-buyer` → {@link OrdersClient.list}
 * - GET `/orders/{orderId}` → {@link OrdersClient.getById}
 * - GET `/orders/{orderId}/status-history` → {@link OrdersClient.getStatusHistory}
 * - GET `/orders/events` (SSE) → {@link OrdersClient.subscribeStatusEvents}
 *
 * Requires a valid JWT to be present in the {@link AuthContext}.
 */
interface OrdersClient {
    /**
     * List orders for the currently authenticated buyer.
     * @param opts Optional pagination settings. Defaults to page=1, pageSize=50.
     * @returns Array of {@link OrderSnapshot} objects, newest first.
     */
    list(opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<OrderSnapshot[]>;
    /** Fetch an order by its identifier. Returns null if not found. */
    getById(orderId: string): Promise<OrderSnapshot | null>;
    /** Retrieve the status history (timeline) for an order. */
    getStatusHistory(orderId: string): Promise<OrderStatusHistory>;
    /**
     * Subscribe to order status events (SSE). Returns an unsubscribe function.
     * Note: this client does not auto-reconnect; consumers may re-subscribe on error.
     */
    subscribeStatusEvents(onEvent: (evt: OrderStatusEventPayload) => void): () => void;
    /** Convenience: triggers handler when an order is delivered or payment completes. */
    onOrderDelivered(handler: (order: OrderSnapshot) => void): () => void;
}
declare class OrdersClientImpl implements OrdersClient {
    private readonly marketApiBase;
    private readonly http;
    private readonly authContext;
    constructor(marketApiBase: string, http: HttpTransport, authContext: AuthContext);
    list(opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<OrderSnapshot[]>;
    getById(orderId: string): Promise<OrderSnapshot | null>;
    getStatusHistory(orderId: string): Promise<OrderStatusHistory>;
    subscribeStatusEvents(onEvent: (evt: OrderStatusEventPayload) => void): () => void;
    onOrderDelivered(handler: (order: OrderSnapshot) => void): () => void;
    private requireToken;
}

interface BasketItemInput {
    seller: string;
    sku: string;
    quantity: number;
    imageUrl?: string;
}
interface PostalAddressInput {
    streetAddress?: string;
    addressLocality?: string;
    postalCode?: string;
    addressCountry?: string;
}
interface ContactPointInput {
    email?: string;
    telephone?: string;
}
interface PersonMinimalInput {
    birthDate?: string;
}
interface Basket {
    basketId: string;
    buyer?: string;
    operator?: string;
    chainId: number;
    items: BasketItemInput[];
    status: string;
    [k: string]: unknown;
}
interface ValidationResult {
    valid: boolean;
    requirements: any[];
    missing: any[];
    ruleTrace: any[];
}

interface CartClient {
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
declare class CartClientImpl implements CartClient {
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

interface MinimalProductInput {
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
interface MinimalOfferInput {
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

type CustomDataLink = {
    '@context': 'https://aboutcircles.com/contexts/circles-linking/';
    '@type': 'CustomDataLink';
    name: string;
    cid: string;
    encrypted: boolean;
    encryptionAlgorithm: string | null;
    encryptionKeyFingerprint: string | null;
    chainId: number;
    signerAddress: string;
    signedAt: number;
    nonce: `0x${string}`;
    signature: `0x${string}` | '';
};

type Cid = string;
interface ProfilesBindings$1 {
    putJsonLd(obj: any): Promise<Cid>;
    getJsonLd(cid: Cid): Promise<any>;
    getLatestProfileCid(avatar: string): Promise<Cid | null>;
    updateAvatarProfileDigest(avatar: string, profileCid: Cid): Promise<string | void>;
    canonicalizeJsonLd?(obj: any): Promise<string> | string;
}
/**
 * Fetch JSON from an IPFS gateway. This is intentionally minimal and can be
 * replaced by bindings.getJsonLd when you have your own gateway.
 */
declare function fetchIpfsJson(cid: string, gatewayUrl?: string): Promise<any>;
declare function ensureProfileShape(obj: any): any;
declare function ensureNamespaceChunkShape(obj: any): any;
declare function ensureNameIndexDocShape(obj: any): any;
declare function loadProfileOrInit(bindings: ProfilesBindings$1, avatar: string): Promise<{
    profile: any;
    profileCid: Cid | null;
}>;
declare function loadIndex(bindings: ProfilesBindings$1, indexCid: Cid | null): Promise<{
    index: any;
    head: any;
    headCid: Cid | null;
}>;
declare function insertIntoHead(head: any, signedLink: CustomDataLink): {
    rotated: boolean;
    closedHead?: any;
};
declare function saveHeadAndIndex(bindings: ProfilesBindings$1, head: any, index: any, closedHead?: any): Promise<{
    headCid: Cid;
    indexCid: Cid;
}>;
declare function rebaseAndSaveProfile(bindings: ProfilesBindings$1, avatar: string, mutator: (profile: any) => void): Promise<Cid>;

declare class CanonicalisationError extends Error {
}
declare function canonicaliseLink(link: CustomDataLink): Uint8Array;
declare function buildLinkDraft(args: {
    name: string;
    cid: string;
    chainId: number;
    signerAddress: string;
    nowSec?: number;
}): Promise<CustomDataLink>;

type ProfilesBindings = ProfilesBindings$1;
interface OffersClient {
    publishOffer(opts: {
        avatar: string;
        operator: string;
        signer: AvatarSigner;
        chainId?: number;
        paymentGateway?: string;
        product: MinimalProductInput;
        offer: MinimalOfferInput;
    }): Promise<{
        productCid: string;
        headCid: string;
        indexCid: string;
        profileCid: string;
        linkCid?: string;
        digest32?: string;
        txHash?: string;
    }>;
    tombstone(opts: {
        avatar: string;
        operator: string;
        signer: AvatarSigner;
        chainId?: number;
        sku: string;
    }): Promise<{
        linkCid?: string;
        headCid: string;
        indexCid: string;
        profileCid: string;
        txHash?: string;
    }>;
}
declare class OffersClientImpl implements OffersClient {
    private readonly bindings?;
    constructor(bindings?: ProfilesBindings | undefined);
    private ensureBindings;
    publishOffer(opts: {
        avatar: string;
        operator: string;
        signer: AvatarSigner;
        chainId?: number;
        paymentGateway?: string;
        product: MinimalProductInput;
        offer: MinimalOfferInput;
    }): Promise<{
        productCid: string;
        headCid: string;
        indexCid: string;
        profileCid: string;
        linkCid?: string;
        digest32?: string;
        txHash?: string;
    }>;
    tombstone(opts: {
        avatar: string;
        operator: string;
        signer: AvatarSigner;
        chainId?: number;
        sku: string;
    }): Promise<{
        linkCid?: string;
        headCid: string;
        indexCid: string;
        profileCid: string;
        txHash?: string;
    }>;
}

interface CirclesClientOptions {
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
declare class CirclesClient {
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

declare class CurrencyCodeError extends Error {
}
declare class ObjectTooLargeError extends Error {
}
declare class UrlValidationError extends Error {
}
/**
 * Public: Build a Product JSON-LD with a single Offer using Circles Market context.
 * Mirrors the logic of the app's buildProduct in circles-app/src/lib/offers/jsonld.ts.
 */
declare function buildProduct(product: MinimalProductInput, offer: MinimalOfferInput): any;

/**
 * Shared utility helpers for the Circles Market SDK
 */
/**
 * Returns true if the given value is a syntactically valid absolute URL.
 * Accepts only strings and ensures protocol and hostname are present.
 */
declare function isAbsoluteUri(u: unknown): u is string;
/**
 * Strictly normalizes an EVM address.
 * - Accepts only strings matching /^0x[a-fA-F0-9]{40}$/
 * - Returns lowercase address
 */
declare function normalizeEvmAddress(v: unknown): string;
/**
 * Type guard for a valid EVM address (lower/upper accepted, not normalized).
 */
declare function isEvmAddress(v: unknown): v is string;
/**
 * Validate SKU format used across app + SDK.
 * Rule: /^[a-z0-9][a-z0-9-_]{0,62}$/
 */
declare function isValidSku(sku: string): boolean;
/**
 * Asserts SKU validity, throwing a concise Error on failure.
 */
declare function assertSku(sku: string): void;

export { type AuthClient, AuthClientImpl, type AuthContext, type AuthContextMeta, type AvatarSigner, type Basket, type BasketItemInput, CanonicalisationError, type CartClient, CartClientImpl, type Cid, CirclesClient, type CirclesClientOptions, type ContactPointInput, CurrencyCodeError, type CustomDataLink, FetchHttpTransport, HttpError, type HttpTransport, InMemoryAuthContext, type MinimalOfferInput, type MinimalProductInput, ObjectTooLargeError, type OffersClient, OffersClientImpl, type OrderOutboxItem, type OrderSnapshot, type OrderStatusEventPayload, type OrderStatusHistory, type OrderStatusHistoryEvent, type OrdersClient, OrdersClientImpl, type PersonMinimalInput, type PostalAddressInput, type ProfilesBindings, type SignersClient, SignersClientImpl, UrlValidationError, type ValidationResult, type WalletProvider, assertSku, buildLinkDraft, buildProduct, canonicaliseLink, ensureNameIndexDocShape, ensureNamespaceChunkShape, ensureProfileShape, fetchIpfsJson, insertIntoHead, isAbsoluteUri, isEvmAddress, isValidSku, loadIndex, loadProfileOrInit, normalizeEvmAddress, rebaseAndSaveProfile, saveHeadAndIndex };
