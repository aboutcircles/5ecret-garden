import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { uint256ToAddress, CirclesConverter } from '@aboutcircles/sdk-utils';
import { formatCurrency } from '$lib/shared/utils/money';
import { circles } from '$lib/shared/state/circles';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const isZeroAddress = (addr?: string | null) => (addr ?? '').toLowerCase() === ZERO_ADDRESS;
export const isAddress = (v: unknown): v is string => typeof v === 'string' && ethers.isAddress(v);

export function toBigIntMaybe(v: unknown): bigint | null {
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return null;
      return BigInt(Math.trunc(v));
    }
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^0x[0-9a-fA-F]+$/.test(s)) return BigInt(s);
      if (/^[+-]?\d+$/.test(s)) return BigInt(s);
    }
    return null;
  } catch (error) {
    console.warn('toBigIntMaybe: failed to convert value to bigint', { value: v, error });
    return null;
  }
}

const tokenIdKeys = new Set(['Id', 'id', 'TokenId', 'tokenId', 'TokenID']);
export function tokenIdToAddressMaybe(key: string, val: unknown): string | null {
  if (!tokenIdKeys.has(key)) return null;
  const bi = toBigIntMaybe(val);
  if (bi === null) return null;
  try {
    const addr = uint256ToAddress(bi);
    if (!isAddress(addr)) return null;
    return addr;
  } catch (error) {
    console.warn('tokenIdToAddressMaybe: failed', { key, val, error });
    return null;
  }
}

export function addressForDisplay(key: string, val: unknown): string {
  const addr = isAddress(val) ? (val as string) : tokenIdToAddressMaybe(key, val);
  return addr ?? '';
}

export function formatAttoCircles(val: unknown): string | null {
  const bi = toBigIntMaybe(val);
  if (bi === null) return null;
  try {
    const circles = CirclesConverter.attoCirclesToCircles(bi);
    if (!Number.isFinite(circles)) return null;
    return formatCurrency(circles, 'CRC');
  } catch (error) {
    console.warn('formatAttoCircles: failed', { val, error });
    return null;
  }
}

export type RawReceiptWaitOptions = {
  timeoutMs?: number;
  pollMs?: number;
  label?: string;
};

export function isBenignReceiptDecodeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = `${error.message ?? ''}`;
  return (
    message.includes('invalid value for value.index') &&
    message.includes('BAD_DATA')
  );
}

function parseReceiptStatus(status: unknown): number {
  if (typeof status === 'number') return status;
  if (typeof status === 'bigint') return Number(status);
  if (typeof status === 'string') {
    const s = status.trim();
    if (s.startsWith('0x') || s.startsWith('0X')) return Number(BigInt(s));
    if (/^[+-]?\d+$/.test(s)) return Number(s);
  }
  return 1;
}

export async function waitForReceiptRaw(
  provider: { send?: (method: string, params?: any[]) => Promise<any> } | null | undefined,
  txHash: string,
  options: RawReceiptWaitOptions = {}
): Promise<any> {
  if (!provider?.send) {
    throw new Error('Provider with send() is required to wait for receipt');
  }

  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 120_000);
  const pollMs = Math.max(200, options.pollMs ?? 1_000);
  const label = options.label ?? 'Transaction';
  const maxAttempts = Math.ceil(timeoutMs / pollMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const receipt = await provider.send('eth_getTransactionReceipt', [txHash]);
    if (receipt) {
      const status = parseReceiptStatus((receipt as any).status);
      if (status === 0) {
        throw new Error(`${label} reverted on-chain`);
      }
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`${label} receipt timeout`);
}

// Fallback receipt-poller for runners (e.g. the Circles-native PK signer) that
// broadcast successfully but don't expose a provider.send(). Wraps the SDK's
// JSON-RPC client so eth_getTransactionReceipt still works.
function getSdkRpcProvider(): { send: (method: string, params?: any[]) => Promise<any> } | null {
  const sdk = get(circles) as any;
  const call = sdk?.rpc?.client?.call;
  if (typeof call !== 'function') return null;
  return {
    send: (method, params) => call.call(sdk.rpc.client, method, params ?? []),
  };
}

export async function sendRunnerTransactionAndWait(
  runner: {
    sendTransaction?: (...args: any[]) => Promise<any>;
    provider?: { send?: (method: string, params?: any[]) => Promise<any> };
  } | null | undefined,
  tx: { to: string; value?: bigint; data?: string },
  options: RawReceiptWaitOptions = {}
): Promise<any> {
  if (!runner?.sendTransaction) {
    throw new Error('Wallet runner is not available');
  }

  // SDK ContractRunner.sendTransaction takes TransactionRequest[] (array)
  const txResponse = await runner.sendTransaction([tx]);
  const txHash = txResponse?.hash ?? txResponse?.transactionHash;
  if (!txHash) {
    throw new Error('Transaction hash missing');
  }

  const provider = runner.provider?.send ? runner.provider : getSdkRpcProvider();
  if (!provider) {
    // Broadcast succeeded but no provider is available to confirm. Throw so the
    // caller can surface an error — returning a hash-only object silently lies
    // to callers that decode receipt.logs (e.g. ConfirmCreateGateway).
    throw new Error(
      `Transaction broadcast (hash: ${txHash}) but receipt cannot be verified — no provider available`
    );
  }
  return waitForReceiptRaw(provider, txHash, options);
}

/**
 * Submit a pre-built transaction batch through the runner and wait for the
 * receipt. Safe runners execute the whole array as a single atomic multisend
 * (required for sequences whose on-chain invariant only holds atomically, e.g.
 * snapshot → personalMint → groupMint → wrap); EOA runners send sequentially,
 * so callers that need atomicity must gate those out before calling this.
 *
 * Mirrors {@link sendRunnerTransactionAndWait} but takes the full `txs` array
 * instead of a single tx.
 */
export async function sendRunnerBatchAndWait(
  runner: {
    sendTransaction?: (...args: any[]) => Promise<any>;
    provider?: { send?: (method: string, params?: any[]) => Promise<any> };
  } | null | undefined,
  txs: ReadonlyArray<{ to: string; value?: bigint; data?: string }>,
  options: RawReceiptWaitOptions = {}
): Promise<any> {
  if (!runner?.sendTransaction) {
    throw new Error('Wallet runner is not available');
  }
  if (txs.length === 0) {
    throw new Error('No transactions to send');
  }

  const txResponse = await runner.sendTransaction(txs);

  // Some runners resolve directly to a mined receipt rather than a tx response
  // carrying a hash. If so, verify it didn't revert and return it as-is instead
  // of re-polling. (A reverted EOA send already throws inside the runner; this
  // guard is defence-in-depth for any runner that returns a status-0 receipt.)
  if (
    txResponse &&
    ((txResponse as any).status !== undefined || (txResponse as any).blockNumber !== undefined) &&
    !(txResponse as any).hash &&
    !(txResponse as any).transactionHash
  ) {
    const status = (txResponse as any).status;
    if (status === 'reverted' || parseReceiptStatus(status) === 0) {
      throw new Error(`${options.label ?? 'Transaction'} reverted on-chain`);
    }
    return txResponse;
  }

  const txHash = txResponse?.hash ?? txResponse?.transactionHash;
  if (!txHash) {
    throw new Error('Transaction hash missing');
  }

  const provider = runner.provider?.send ? runner.provider : getSdkRpcProvider();
  if (!provider) {
    throw new Error(
      `Transaction broadcast (hash: ${txHash}) but receipt cannot be verified — no provider available`
    );
  }
  return waitForReceiptRaw(provider, txHash, options);
}
