export class AuthClientImpl {
    constructor(marketApiBase, http, authContext, signers) {
        this.marketApiBase = marketApiBase;
        this.http = http;
        this.authContext = authContext;
        this.signers = signers;
    }
    async signInWithAvatar(options) {
        const chainId = options.chainId ?? 100;
        // 1) Request challenge
        const ch = await this.http.request({
            method: 'POST',
            url: `${this.marketApiBase}/api/auth/challenge`,
            body: { address: options.avatar, chainId },
        });
        // interpret message as utf-8 string to bytes
        const msgBytes = new TextEncoder().encode(ch.message);
        // 2) Sign with Safe-based signer (reuse injected SignersClient)
        const safeSigner = await this.signers.createSafeSignerForAvatar({
            avatar: options.avatar,
            ethereum: options.ethereum,
            chainId: BigInt(chainId),
            enforceChainId: true,
        });
        const signature = await safeSigner.signBytes(msgBytes);
        // 3) Verify
        const verify = await this.http.request({
            method: 'POST',
            url: `${this.marketApiBase}/api/auth/verify`,
            body: { challengeId: ch.challengeId, signature },
        });
        this.authContext.setToken(verify.token, verify.expiresIn, verify.address, verify.chainId);
        return { address: verify.address, chainId: verify.chainId };
    }
    signOut() {
        this.authContext.clear();
    }
    getAuthMeta() {
        return this.authContext.getMeta();
    }
}
