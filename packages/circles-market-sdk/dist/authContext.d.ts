export interface AuthContextMeta {
    address: string;
    chainId: number;
}
export interface AuthContext {
    /** Returns the current JWT if valid (with a small grace window), otherwise null. */
    getToken(): string | null;
    /** Stores a new JWT along with its lifetime and associated address/chain. */
    setToken(token: string, expSeconds: number, addr: string, chainId: number): void;
    /** Clears any stored authentication token and metadata. */
    clear(): void;
    /** Returns metadata only if a valid token is present; otherwise null. */
    getMeta(): AuthContextMeta | null;
}
export declare class InMemoryAuthContext implements AuthContext {
    private token;
    private exp;
    private meta;
    private expiryGraceSeconds;
    getToken(): string | null;
    setToken(token: string, expSeconds: number, addr: string, chainId: number): void;
    clear(): void;
    getMeta(): AuthContextMeta | null;
}
//# sourceMappingURL=authContext.d.ts.map