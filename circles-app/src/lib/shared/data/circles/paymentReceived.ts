import type { Sdk } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';
import { ethers } from 'ethers';

export type PaymentRow = {
  payer: Address;
  payee: Address;
  gateway: Address;
  amount: bigint;
  /** Raw 0x-prefixed hex string from the indexer */
  data: string;
  /** Best-effort UTF-8 decode of `data`; empty string if undecodable */
  dataDecoded: string;
  /** Unix seconds */
  timestamp: number;
  tx: string;
  blockNumber: number;
};

type RpcQueryResult = {
  columns?: string[];
  rows?: any[][];
};

/** Hex (0x...) → UTF-8 string. Returns the input on failure. Mirrors marketplaceExplorer.html:1109. */
export function hexToUtf8(hex: string): string {
  if (!hex || !hex.startsWith('0x')) return hex || '';
  try {
    const bytes: number[] = [];
    for (let i = 2; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return hex;
  }
}

/**
 * Format a wei-like amount (18 decimals) to a CRC string with trailing zeros trimmed.
 * Accepts bigint or numeric string. Mirrors marketplaceExplorer.html:1119.
 *
 * Manual implementation rather than ethers.formatUnits to handle raw circles_query
 * string columns without precision drift.
 */
export function formatCrcAmount(amountWei: bigint | string): string {
  if (amountWei === undefined || amountWei === null) return '0';
  const s = typeof amountWei === 'bigint' ? amountWei.toString() : String(amountWei);
  if (!s || s === '0') return '0';
  if (s.length <= 18) {
    const f = s.replace(/0+$/, '');
    return f ? '0.' + '0'.repeat(18 - s.length) + f : '0';
  }
  const whole = s.slice(0, s.length - 18);
  const frac = s.slice(s.length - 18).replace(/0+$/, '');
  return frac ? whole + '.' + frac : whole;
}

/**
 * Fetch all PaymentReceived events for a given payee address.
 * Public, no auth required. Mirrors marketplaceExplorer.html:1151-1154.
 */
export async function fetchPaymentsByPayee(
  sdk: Sdk,
  payee: string,
  limit: number = 200
): Promise<PaymentRow[]> {
  if (!sdk?.rpc || !payee) return [];
  if (!ethers.isAddress(payee)) return [];

  const resp: RpcQueryResult = await sdk.rpc.client.call('circles_query', [
    {
      Namespace: 'CrcV2_PaymentGateway',
      Table: 'PaymentReceived',
      Columns: ['payer', 'payee', 'gateway', 'amount', 'data', 'timestamp', 'transactionHash', 'blockNumber'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'payee',
          Value: payee.toLowerCase(),
        },
      ],
      Order: [{ Column: 'blockNumber', SortOrder: 'DESC' }],
      Limit: limit,
    },
  ]);

  const cols = resp?.columns ?? [];
  const rows = resp?.rows ?? [];

  const idxPayer = cols.indexOf('payer');
  const idxPayee = cols.indexOf('payee');
  const idxGw = cols.indexOf('gateway');
  const idxAmount = cols.indexOf('amount');
  const idxData = cols.indexOf('data');
  const idxTs = cols.indexOf('timestamp');
  const idxTx = cols.indexOf('transactionHash');
  const idxBn = cols.indexOf('blockNumber');

  const out: PaymentRow[] = [];
  for (const r of rows) {
    // Skip rows where the indexer returned malformed addresses or unparseable amounts
    // — one bad row should not blank the whole panel.
    try {
      const payerRaw = r[idxPayer];
      const payeeRaw = r[idxPayee];
      const gwRaw = r[idxGw];
      if (!payerRaw || !payeeRaw || !gwRaw) continue;

      const data = String(r[idxData] ?? '');
      let amount: bigint = 0n;
      try {
        amount = BigInt(String(r[idxAmount] ?? '0'));
      } catch {
        amount = 0n;
      }

      out.push({
        payer: ethers.getAddress(payerRaw) as Address,
        payee: ethers.getAddress(payeeRaw) as Address,
        gateway: ethers.getAddress(gwRaw) as Address,
        amount,
        data,
        dataDecoded: hexToUtf8(data),
        timestamp: Number(r[idxTs] ?? 0),
        tx: String(r[idxTx] ?? ''),
        blockNumber: Number(r[idxBn] ?? 0),
      });
    } catch (e) {
      console.warn('[paymentReceived] skipped malformed row', e);
    }
  }

  return out;
}
