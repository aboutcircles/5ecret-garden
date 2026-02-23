import { JsonRpcProvider } from 'ethers';
import type { SdkContractRunner, TransactionRequest, TransactionResponse, BatchRun } from '@circles-sdk/adapter';
import type { Address } from '@circles-sdk/utils';
import { sendTransactions } from '@aboutcircles/miniapp-sdk';

/**
 * SdkContractRunner for miniapp iframe mode.
 *
 * - Read operations (call, estimateGas, resolveName) use a direct JsonRpcProvider.
 * - sendTransaction / sendBatchTransaction delegate to the parent host via
 *   the @aboutcircles/miniapp-sdk which handles the postMessage protocol.
 */
export class MiniappContractRunner implements SdkContractRunner {
  address: Address;
  private provider: JsonRpcProvider;

  constructor(address: Address, rpcUrl: string) {
    this.address = address;
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  estimateGas = async (tx: TransactionRequest): Promise<bigint> => {
    return this.provider.estimateGas({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      from: this.address,
    });
  };

  call = async (tx: TransactionRequest): Promise<string> => {
    return this.provider.call({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      from: this.address,
    });
  };

  resolveName = async (name: string): Promise<string | null> => {
    return this.provider.resolveName(name);
  };

  sendTransaction = async (tx: TransactionRequest): Promise<TransactionResponse> => {
    const hashes = await sendTransactions([
      {
        to: tx.to,
        data: tx.data ?? '0x',
        value: tx.value !== undefined ? tx.value.toString() : undefined,
      },
    ]);

    const hash = hashes[0] ?? '';
    return {
      hash,
      blockNumber: 0,
      blockHash: '',
      index: 0,
      type: 2,
      to: tx.to,
      from: this.address,
      gasLimit: 0n,
      gasPrice: 0n,
      data: tx.data ?? '0x',
      value: tx.value ?? 0n,
      chainId: 100,
    };
  };

  sendBatchTransaction = (): BatchRun => {
    const txs: TransactionRequest[] = [];

    return {
      addTransaction(tx: TransactionRequest) {
        txs.push(tx);
      },
      run: async (): Promise<TransactionResponse> => {
        const hashes = await sendTransactions(
          txs.map((tx) => ({
            to: tx.to,
            data: tx.data ?? '0x',
            value: tx.value !== undefined ? tx.value.toString() : undefined,
          }))
        );

        const hash = hashes[0] ?? '';
        return {
          hash,
          blockNumber: 0,
          blockHash: '',
          index: 0,
          type: 2,
          to: txs[0]?.to ?? ('' as Address),
          from: this.address,
          gasLimit: 0n,
          gasPrice: 0n,
          data: '',
          value: 0n,
          chainId: 100,
        };
      },
    };
  };
}
