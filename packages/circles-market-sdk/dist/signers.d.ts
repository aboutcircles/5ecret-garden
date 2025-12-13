export interface WalletProvider {
    request<T = unknown>(args: {
        method: string;
        params?: unknown[];
    }): Promise<T>;
}
export interface AvatarSigner {
    avatar: string;
    chainId: bigint;
    signBytes(payload: Uint8Array): Promise<`0x${string}`>;
}
export interface SignersClient {
    createSafeSignerForAvatar(opts: {
        avatar: string;
        ethereum: WalletProvider;
        chainId: bigint;
        enforceChainId?: boolean;
    }): Promise<AvatarSigner>;
}
export declare class SignersClientImpl implements SignersClient {
    createSafeSignerForAvatar(opts: {
        avatar: string;
        ethereum: WalletProvider;
        chainId: bigint;
        enforceChainId?: boolean;
    }): Promise<AvatarSigner>;
}
//# sourceMappingURL=signers.d.ts.map