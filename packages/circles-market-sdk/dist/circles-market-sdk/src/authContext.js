export class InMemoryAuthContext {
    constructor() {
        this.token = null;
        this.exp = null; // epoch seconds
        this.meta = null;
        this.expiryGraceSeconds = 15; // small grace to avoid edge expiry
    }
    getToken() {
        if (!this.token || !this.exp)
            return null;
        const now = Math.floor(Date.now() / 1000);
        if (now >= (this.exp - this.expiryGraceSeconds)) {
            // expired or about to expire
            return null;
        }
        return this.token;
    }
    setToken(token, expSeconds, addr, chainId) {
        this.token = token;
        this.exp = Math.floor(Date.now() / 1000) + expSeconds;
        this.meta = { address: addr.toLowerCase(), chainId };
    }
    clear() {
        this.token = null;
        this.exp = null;
        this.meta = null;
    }
    getMeta() {
        // Only return meta if token is still valid to avoid stale auth usage
        return this.getToken() ? this.meta : null;
    }
}
