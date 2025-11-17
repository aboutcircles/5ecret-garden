// src/lib/safeSigner/signers/metamask.ts
import type {Address, Hex, EIP1193Provider} from '../types';
import {bytesToHex, hexToBytes} from '../bytes';
import {computeSafeHash, buildSafeDomainSeparator} from '../safeHash';
import {secp256k1} from '@noble/curves/secp256k1';
import {keccak_256} from '@noble/hashes/sha3';

function isValidAddress(addr: string): addr is Address {
    const ok = typeof addr === 'string' && addr.startsWith('0x') && /^[0-9a-fA-F]{40}$/.test(addr.slice(2));
    return ok;
}

function normalizePayloadHex(payload: Uint8Array | Hex): Hex {
    const isHex = typeof payload === 'string' && payload.startsWith('0x');
    const isBytes = payload instanceof Uint8Array;
    if (isHex) {
        return payload as Hex;
    }
    if (isBytes) {
        return bytesToHex(payload as Uint8Array);
    }
    throw new TypeError('payload must be Uint8Array or 0x-hex');
}

function buildTypedData(args: { chainId: bigint; safeAddress: Address; payload: Hex }) {
    const {chainId, safeAddress, payload} = args;
    const chainIdNumber = Number(chainId);
    const okInt = Number.isSafeInteger(chainIdNumber) && chainIdNumber > 0;
    if (!okInt) {
        throw new RangeError('chainId must be a safe integer > 0 for MetaMask typed data');
    }

    return {
        types: {
            EIP712Domain: [
                {name: 'chainId', type: 'uint256'},
                {name: 'verifyingContract', type: 'address'},
            ],
            SafeMessage: [{name: 'message', type: 'bytes'}],
        },
        primaryType: 'SafeMessage',
        domain: {chainId: chainIdNumber, verifyingContract: safeAddress},
        message: {message: payload},
    } as const;
}

function normalizeV(vByte: number): 27 | 28 {
    const is01 = vByte === 0 || vByte === 1;
    const is2728 = vByte === 27 || vByte === 28;
    if (is01) {
        return (vByte + 27) as 27 | 28;
    }
    if (is2728) {
        return vByte as 27 | 28;
    }
    throw new TypeError('unexpected v in signature');
}

function flipV(v: 27 | 28): 27 | 28 {
    const flipped = v === 27 ? 28 : 27;
    return flipped;
}

function toChecksum(addrLowerHex: string): Address {
    const raw = addrLowerHex.slice(2).toLowerCase();
    const hash = keccak_256(new TextEncoder().encode(raw));
    let out = '0x';
    for (let i = 0; i < raw.length; i++) {
        const nibble = (hash[i >> 1] >> ((1 - (i & 1)) * 4)) & 0xf;
        const ch = nibble >= 8 ? raw[i].toUpperCase() : raw[i];
        out += ch;
    }
    return out as Address;
}

function recoverAddressFromDigest(digest32: Hex, r: Hex, s: Hex, v: 27 | 28): Address {
    const msg = hexToBytes(digest32);
    const rBytes = hexToBytes(r);
    const sBytes = hexToBytes(s);

    const compact = new Uint8Array(64);
    compact.set(rBytes, 0);
    compact.set(sBytes, 32);

    const recId: 0 | 1 = (v - 27) as 0 | 1;
    const pub = secp256k1.Signature
        .fromCompact(compact)
        .addRecoveryBit(recId)
        .recoverPublicKey(msg)
        .toRawBytes(false); // uncompressed (0x04 || X || Y)

    const raw = pub.slice(1);
    const h = keccak_256(raw);
    const addr = '0x' + Buffer.from(h.slice(12)).toString('hex');
    return toChecksum(addr);
}

/**
 * Signs SafeMessage via MetaMask's eth_signTypedData_v4 and guarantees
 * the recovered signer equals the connected `account`. Returns 65b 0x-hex r||s||v.
 */
export async function signSafePayloadWithMetaMask(args: {
    ethereum: EIP1193Provider;
    account: Address;
    payload: Uint8Array | Hex;
    chainId: bigint;
    safeAddress: Address;
    enforceChainId?: boolean;
}): Promise<Hex> {
    const {ethereum, account, payload, chainId, safeAddress, enforceChainId} = args;

    const hasReq = typeof ethereum?.request === 'function';
    if (!hasReq) {
        throw new TypeError('invalid EIP-1193 provider');
    }
    if (!isValidAddress(account)) {
        throw new TypeError('invalid account');
    }
    if (!isValidAddress(safeAddress)) {
        throw new TypeError('invalid address');
    }
    if (chainId <= 0n) {
        throw new RangeError('chainId must be > 0');
    }

    function parseChainIdToBigInt(raw: unknown): bigint {
        const isStr = typeof raw === 'string';
        const isNum = typeof raw === 'number';
        if (isStr) {
            return raw.startsWith('0x') ? BigInt(raw) : BigInt(Number.parseInt(raw, 10));
        }
        if (isNum) {
            return BigInt(Math.trunc(raw));
        }
        throw new TypeError('unexpected eth_chainId result');
    }

    if (enforceChainId === true) {
        const providerCidRaw = await ethereum.request({method: 'eth_chainId'});
        const providerCid = parseChainIdToBigInt(providerCidRaw);
        const mismatch = providerCid !== chainId;
        if (mismatch) {
            throw new Error(`provider chainId mismatch: provider=${providerCid} expected=${chainId}`);
        }
    }

    const payloadHex = normalizePayloadHex(payload);
    const typedData = buildTypedData({chainId, safeAddress, payload: payloadHex});

    const sigHexUnknown = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(typedData)],
    });

    const isHex = typeof sigHexUnknown === 'string' && sigHexUnknown.startsWith('0x');
    if (!isHex) {
        throw new Error('MetaMask returned a non-hex signature');
    }
    const sigBytes = hexToBytes(sigHexUnknown as Hex);
    const lenOk = sigBytes.length === 65;
    if (!lenOk) {
        throw new Error('MetaMask returned an invalid signature length');
    }

    const r: Hex = bytesToHex(sigBytes.slice(0, 32));
    const s: Hex = bytesToHex(sigBytes.slice(32, 64));
    let v: 27 | 28 = normalizeV(sigBytes[64]);

    const n = secp256k1.CURVE.n;
    const halfN = n >> 1n;
    const sVal = BigInt(s);
    const lowS = sVal > 0n && sVal <= halfN;
    if (!lowS) {
        throw new Error('non-canonical s');
    }

    const digest: Hex = computeSafeHash({payload: payloadHex, chainId, safeAddress});

    const recBefore = recoverAddressFromDigest(digest, r, s, v);
    const matchesBefore = recBefore.toLowerCase() === account.toLowerCase();

    if (!matchesBefore) {
        const vFlipped = flipV(v);
        const recAfterFlip = recoverAddressFromDigest(digest, r, s, vFlipped);
        const matchesAfter = recAfterFlip.toLowerCase() === account.toLowerCase();
        if (!matchesAfter) {
            throw new Error(`wallet returned a signature that does not recover to the connected account: got=${recBefore}, flipped=${recAfterFlip}, account=${account}`);
        }
        v = vFlipped;
    }

    const recFinal = recoverAddressFromDigest(digest, r, s, v);
    const matchesFinal = recFinal.toLowerCase() === account.toLowerCase();
    if (!matchesFinal) {
        throw new Error(`post-fix recovery mismatch: rec=${recFinal} account=${account}`);
    }

    console.debug('[safeSigner/metamask]', {
        digest,
        r,
        s,
        v,
        recBefore,
        recFinal,
        account,
        safeAddress,
    });

    const out = new Uint8Array(65);
    out.set(hexToBytes(r), 0);
    out.set(hexToBytes(s), 32);
    out.set(new Uint8Array([v]), 64);
    return bytesToHex(out);
}

/**
 * Factory compatible with existing imports.
 * Returns the Safe-signer wrapper using MetaMask under the hood.
 */
export function createMetaMaskSafeSigner(config: {
    ethereum: EIP1193Provider;
    account: Address;
    chainId: bigint;
    safeAddress: Address;
    enforceChainId?: boolean;
}) {
    const {ethereum, account, chainId, safeAddress, enforceChainId} = config;

    const badAccount = !isValidAddress(account);
    if (badAccount) {
        throw new TypeError('invalid account');
    }

    const badChain = chainId <= 0n;
    if (badChain) {
        throw new RangeError('chainId must be > 0');
    }

    const badSafe = !isValidAddress(safeAddress);
    if (badSafe) {
        throw new TypeError('invalid address');
    }

    const domainSeparator = buildSafeDomainSeparator({chainId, safeAddress});

    return {
        domainSeparator(): Hex {
            return domainSeparator;
        },
        computeHash(payload: Uint8Array | Hex): Hex {
            return computeSafeHash({payload, chainId, safeAddress});
        },
        async sign(payload: Uint8Array | Hex): Promise<Hex> {
            return signSafePayloadWithMetaMask({
                ethereum,
                account,
                payload,
                chainId,
                safeAddress,
                enforceChainId,
            });
        },
    };
}
