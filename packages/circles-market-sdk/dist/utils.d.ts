/**
 * Shared utility helpers for the Circles Market SDK
 */
/**
 * Returns true if the given value is a syntactically valid absolute URL.
 * Accepts only strings and ensures protocol and hostname are present.
 */
export declare function isAbsoluteUri(u: unknown): u is string;
/**
 * Strictly normalizes an EVM address.
 * - Accepts only strings matching /^0x[a-fA-F0-9]{40}$/
 * - Returns lowercase address
 */
export declare function normalizeEvmAddress(v: unknown): string;
/**
 * Type guard for a valid EVM address (lower/upper accepted, not normalized).
 */
export declare function isEvmAddress(v: unknown): v is string;
/**
 * Validate SKU format used across app + SDK.
 * Rule: /^[a-z0-9][a-z0-9-_]{0,62}$/
 */
export declare function isValidSku(sku: string): boolean;
/**
 * Asserts SKU validity, throwing a concise Error on failure.
 */
export declare function assertSku(sku: string): void;
//# sourceMappingURL=utils.d.ts.map