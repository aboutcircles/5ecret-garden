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

export class InMemoryAuthContext implements AuthContext {
  private token: string | null = null;
  private exp: number | null = null; // epoch seconds
  private meta: AuthContextMeta | null = null;
  private expiryGraceSeconds = 15; // small grace to avoid edge expiry

  getToken(): string | null {
    if (!this.token || !this.exp) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now >= (this.exp - this.expiryGraceSeconds)) {
      // expired or about to expire
      return null;
    }
    return this.token;
  }

  setToken(token: string, expSeconds: number, addr: string, chainId: number): void {
    this.token = token;
    this.exp = Math.floor(Date.now() / 1000) + expSeconds;
    this.meta = { address: addr.toLowerCase(), chainId };
  }

  clear(): void {
    this.token = null;
    this.exp = null;
    this.meta = null;
  }

  getMeta(): AuthContextMeta | null {
    // Only return meta if token is still valid to avoid stale auth usage
    return this.getToken() ? this.meta : null;
  }
}
