import type { Sdk } from '@aboutcircles/sdk';
import { ethers } from 'ethers';

export type GatewayListRow = {
  gateway: string;
  timestamp?: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  tx?: string;
};

export type GatewayTrustRow = {
  trustReceiver: string;
  expiry: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
};

type RpcQueryResult = {
  columns?: string[];
  rows?: any[][];
};

export async function fetchGatewayRowsByOwner(sdk: Sdk, owner: string): Promise<GatewayListRow[]> {
  if (!sdk?.rpc || !owner) return [];

  const resp: RpcQueryResult = await sdk.rpc.client.call('circles_query', [
    {
      Namespace: 'CrcV2_PaymentGateway',
      Table: 'GatewayCreated',
      Columns: ['gateway', 'timestamp', 'transactionHash', 'blockNumber'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'owner',
          Value: owner.toLowerCase(),
        },
      ],
      Order: [],
    },
  ]);

  const cols = resp?.columns ?? [];
  const rows = resp?.rows ?? [];

  const idxG = cols.indexOf('gateway');
  const idxTs = cols.indexOf('timestamp');
  const idxTx = cols.indexOf('transactionHash');
  const idxBn = cols.indexOf('blockNumber');

  return rows
    .map((r: any[]) => {
      const gateway = r[idxG] ? ethers.getAddress(r[idxG]) : '';
      if (!gateway) return null;
      return {
        gateway,
        timestamp: r[idxTs] ? Number(r[idxTs]) : undefined,
        tx: r[idxTx] ?? undefined,
        blockNumber: r[idxBn] ? Number(r[idxBn]) : 0,
        transactionIndex: 0,
        logIndex: 0,
      } as GatewayListRow;
    })
    .filter((r: any): r is GatewayListRow => r !== null)
    .sort((a: GatewayListRow, b: GatewayListRow) => b.blockNumber - a.blockNumber);
}

export async function fetchActiveTrustRowsByGateway(
  sdk: Sdk,
  gateway: string,
  nowSec: number = Math.floor(Date.now() / 1000)
): Promise<GatewayTrustRow[]> {
  if (!sdk?.rpc || !gateway) return [];

  const resp: RpcQueryResult = await sdk.rpc.client.call('circles_query', [
    {
      Namespace: 'CrcV2_PaymentGateway',
      Table: 'TrustUpdated',
      Columns: ['trustReceiver', 'expiry', 'blockNumber', 'transactionIndex', 'logIndex'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'gateway',
          Value: gateway.toLowerCase(),
        },
      ],
      Order: [],
    },
  ]);

  const cols = resp?.columns ?? [];
  const rows = resp?.rows ?? [];

  const idxR = cols.indexOf('trustReceiver');
  const idxE = cols.indexOf('expiry');
  const idxB = cols.indexOf('blockNumber');
  const idxTi = cols.indexOf('transactionIndex');
  const idxLi = cols.indexOf('logIndex');

  type Latest = {
    expiry: number;
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
  };
  const latestByReceiver = new Map<string, Latest>();

  for (const r of rows) {
    const receiver = r[idxR] ? ethers.getAddress(r[idxR]) : '';
    if (!receiver) continue;

    const next: Latest = {
      expiry: r[idxE] ? Number(r[idxE]) : 0,
      blockNumber: r[idxB] ? Number(r[idxB]) : 0,
      transactionIndex: r[idxTi] ? Number(r[idxTi]) : 0,
      logIndex: r[idxLi] ? Number(r[idxLi]) : 0,
    };

    const prev = latestByReceiver.get(receiver);
    if (
      !prev ||
      next.blockNumber > prev.blockNumber ||
      (next.blockNumber === prev.blockNumber &&
        (next.transactionIndex > prev.transactionIndex ||
          (next.transactionIndex === prev.transactionIndex && next.logIndex > prev.logIndex)))
    ) {
      latestByReceiver.set(receiver, next);
    }
  }

  return Array.from(latestByReceiver.entries())
    .map(([trustReceiver, v]) => ({
      trustReceiver,
      expiry: v.expiry,
      blockNumber: v.blockNumber,
      transactionIndex: v.transactionIndex,
      logIndex: v.logIndex,
    }))
    .filter((row) => row.expiry > nowSec)
    .sort((a, b) => a.trustReceiver.localeCompare(b.trustReceiver));
}
