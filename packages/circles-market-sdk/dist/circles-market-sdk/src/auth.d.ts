import type { HttpTransport } from './http';
import type { AuthContext } from './authContext';
import type { WalletProvider, SignersClient } from './signers';
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
export declare class AuthClientImpl implements AuthClient {
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
//# sourceMappingURL=auth.d.ts.map