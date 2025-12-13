import { normalizeEvmAddress } from './utils';
export class SignersClientImpl {
    async createSafeSignerForAvatar(opts) {
        const avatar = normalizeEvmAddress(opts.avatar);
        const chainId = opts.chainId;
        if (opts.enforceChainId) {
            const reported = await opts.ethereum.request({ method: 'eth_chainId' });
            const reportedNum = BigInt(reported);
            if (reportedNum !== chainId) {
                throw new Error(`Wrong chain. Expected ${chainId} got ${reported}`);
            }
        }
        // Request accounts and capture owner EOA to use as `from` for signing
        const accounts = await opts.ethereum.request({ method: 'eth_requestAccounts', params: [] });
        if (!accounts || accounts.length === 0) {
            throw new Error('No EOA account unlocked in wallet');
        }
        const owner = normalizeEvmAddress(accounts[0]);
        const signer = {
            avatar,
            chainId,
            signBytes: async (payload) => {
                // Build EIP-712 Typed Data for SafeMessage(bytes)
                const typedData = buildSafeMessageTypedData(avatar, chainId, payload);
                const sig = await opts.ethereum.request({
                    method: 'eth_signTypedData_v4',
                    params: [owner, JSON.stringify(typedData)],
                });
                return sig;
            },
        };
        return signer;
    }
}
function toHex(bytes) {
    return ('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''));
}
// Minimal Safe v1.3 typed data for SafeMessage(bytes)
function buildSafeMessageTypedData(avatar, chainId, payload) {
    return {
        domain: {
            chainId: Number(chainId),
            verifyingContract: avatar,
        },
        primaryType: 'SafeMessage',
        types: {
            EIP712Domain: [
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            SafeMessage: [{ name: 'message', type: 'bytes' }],
        },
        message: {
            message: toHex(payload),
        },
    };
}
