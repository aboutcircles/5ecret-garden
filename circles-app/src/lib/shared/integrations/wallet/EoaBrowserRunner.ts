import type { ContractRunner } from '@aboutcircles/sdk-types';
import type { Address, TransactionRequest } from '@aboutcircles/sdk-types';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { gnosis } from 'viem/chains';

/**
 * EOA (Externally Owned Account) browser runner.
 * Implements ContractRunner for direct wallet transactions (no Safe wrapping).
 *
 * Transactions are sent individually through the connected browser wallet.
 * Unlike SafeBrowserRunner, there is no batching — each tx prompts a signature.
 */
export class EoaBrowserRunner implements ContractRunner {
  address?: Address;
  publicClient: PublicClient;
  private walletClient: WalletClient;

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient,
    eoaAddress: Address,
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.address = eoaAddress;
  }

  static async create(
    rpcUrl: string,
    eip1193Provider: any,
    eoaAddress: Address,
  ): Promise<EoaBrowserRunner> {
    const publicClient = createPublicClient({
      chain: gnosis,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      chain: gnosis,
      transport: custom(eip1193Provider),
    });

    const runner = new EoaBrowserRunner(publicClient, walletClient, eoaAddress);
    await runner.init();
    return runner;
  }

  async init(): Promise<void> {
    // No initialization needed for EOA — wallet is already connected
  }

  estimateGas = async (tx: TransactionRequest): Promise<bigint> => {
    return this.publicClient.estimateGas({
      account: this.address as `0x${string}`,
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value,
    });
  };

  call = async (tx: TransactionRequest): Promise<string> => {
    const result = await this.publicClient.call({
      account: (tx.from || this.address) as `0x${string}`,
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value,
      gas: tx.gas,
      gasPrice: tx.gasPrice,
    });
    return result.data || '0x';
  };

  resolveName = async (name: string): Promise<string | null> => {
    try {
      const address = await this.publicClient.getEnsAddress({ name });
      return address;
    } catch {
      return null;
    }
  };

  /**
   * Send transactions sequentially through the browser wallet.
   * Each transaction prompts a separate MetaMask signature.
   */
  sendTransaction = async (txs: TransactionRequest[]): Promise<any> => {
    if (txs.length === 0) {
      throw new Error('No transactions provided');
    }

    let receipt: any;

    for (const tx of txs) {
      const hash = await this.walletClient.sendTransaction({
        account: this.address as `0x${string}`,
        to: tx.to as `0x${string}`,
        data: (tx.data ?? '0x') as `0x${string}`,
        value: tx.value ?? 0n,
        chain: gnosis,
      });

      receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        throw new Error(
          `Transaction reverted: ${receipt.transactionHash} at block ${receipt.blockNumber}`,
        );
      }
    }

    return receipt;
  };
}
