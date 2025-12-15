import type { HttpTransport } from '@circles-market/core';
import type { AuthContext } from '@circles-market/session';
import type { WalletProvider, SignersClient, AvatarSigner } from '@circles-market/signers';

/**
 * Authentication client for Circles Market API.
 * Handles Safe-based SIWE: requests a challenge, signs bytes via SafeMessage, and verifies to obtain a JWT.
 */
export interface AuthClient {
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
    chainId?: number; // default 100
  }): Promise<{ address: string; chainId: number }>;

  /** Clears the stored auth token and metadata. */
  signOut(): void;

  /** Returns current auth metadata if token is still valid; otherwise null. */
  getAuthMeta(): { address: string; chainId: number } | null;
}

export class AuthClientImpl implements AuthClient {
  constructor(
    private readonly marketApiBase: string,
    private readonly http: HttpTransport,
    private readonly authContext: AuthContext,
    private readonly signers: SignersClient,
  ) {}

  async signInWithAvatar(options: {
    avatar: string;
    ethereum: WalletProvider;
    chainId?: number;
  }): Promise<{ address: string; chainId: number }> {
    const chainId = options.chainId ?? 100;

    // 1) Request challenge
    const ch = await this.http.request<{
      challengeId: string;
      message: string; // utf-8 string to be signed as bytes
    }>({
      method: 'POST',
      url: `${this.marketApiBase}/api/auth/challenge`,
      body: { address: options.avatar, chainId },
    });

    // interpret message as utf-8 string to bytes
    const msgBytes = new TextEncoder().encode(ch.message);

    // 2) Sign with Safe-based signer (reuse injected SignersClient)
    const safeSigner: AvatarSigner = await this.signers.createSafeSignerForAvatar({
      avatar: options.avatar,
      ethereum: options.ethereum,
      chainId: BigInt(chainId),
      enforceChainId: true,
    });

    const signature = await safeSigner.signBytes(msgBytes);

    // 3) Verify
    const verify = await this.http.request<{
      token: string;
      expiresIn: number; // seconds from now
      address: string;
      chainId: number;
    }>({
      method: 'POST',
      url: `${this.marketApiBase}/api/auth/verify`,
      body: { challengeId: ch.challengeId, signature },
    });

    this.authContext.setToken(verify.token, verify.expiresIn, verify.address, verify.chainId);
    return { address: verify.address, chainId: verify.chainId };
  }

  signOut(): void {
    this.authContext.clear();
  }

  getAuthMeta(): { address: string; chainId: number } | null {
    return this.authContext.getMeta();
  }
}
