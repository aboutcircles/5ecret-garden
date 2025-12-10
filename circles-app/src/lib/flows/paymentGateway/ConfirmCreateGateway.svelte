<script lang="ts">
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { popupControls } from '$lib/stores/popUp';
  import type { CreateGatewayFlowContext } from './context';

  interface Props {
    context: CreateGatewayFlowContext;
    onCreated?: (gateway: string) => void;
  }

  let { context, onCreated }: Props = $props();

  const factoryAbi = [
    'function createGateway(string name, bytes32 metadataDigest) returns (address)',
    'event GatewayCreated(address indexed owner, address indexed gateway)'
  ];
  const factoryIface = new ethers.Interface(factoryAbi);

  function isAddress(v: string): boolean {
    try {
      ethers.getAddress(v);
      return true;
    } catch {
      return false;
    }
  }

  function isHex32(v: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test((v || '').trim());
  }

  const factoryValid = $derived(isAddress(context.factoryAddress));
  const metadataValid = $derived(isHex32(context.metadataDigest));
  const nameValid = $derived((context.gatewayName ?? '').trim().length > 0);

  const canSubmit = $derived(factoryValid && metadataValid && nameValid);

  async function createGateway() {
    if (!canSubmit) {
      return;
    }
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }

    await runTask({
      name: 'Creating payment gateway…',
      promise: (async () => {
        // Remember factory for next time
        try {
          localStorage.setItem('pg_factory', context.factoryAddress);
        } catch {
          // ignore
        }

        const data = factoryIface.encodeFunctionData('createGateway', [
          context.gatewayName,
          context.metadataDigest
        ]);

        const tx = await $wallet.sendTransaction!({
          to: context.factoryAddress,
          value: 0n,
          data
        });

        const receipt = await $wallet.provider.waitForTransaction(tx.hash);
        if (!receipt) {
          throw new Error('No transaction receipt found.');
        }

        let createdGateway: string | null = null;

        for (const log of receipt.logs ?? []) {
          try {
            const parsed = factoryIface.parseLog(log);
            if (parsed?.name === 'GatewayCreated') {
              const gw = (parsed.args?.[1] as string | undefined) ?? '';
              if (gw) {
                createdGateway = ethers.getAddress(gw);
                break;
              }
            }
          } catch {
            // ignore non-matching logs
          }
        }

        if (createdGateway) {
          try {
            localStorage.setItem('pg_gateway', createdGateway);
          } catch {
            // ignore
          }
          onCreated?.(createdGateway);
        }
      })()
    });

    // Close the flow after submit (success or error)
    popupControls.close();
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <p class="text-sm text-base-content/70">
      Please confirm the details of the payment gateway before creating it.
    </p>

    <div class="bg-base-100 border border-base-300 rounded-xl p-4 space-y-3">
      <div class="text-sm">
        <div class="text-base-content/70">Factory</div>
        <div class="font-mono break-all">{context.factoryAddress}</div>
      </div>
      <div class="text-sm">
        <div class="text-base-content/70">Gateway name</div>
        <div>{context.gatewayName}</div>
      </div>
      <div class="text-sm">
        <div class="text-base-content/70">Metadata digest</div>
        <div class="font-mono break-all">{context.metadataDigest}</div>
      </div>
    </div>

    {#if !factoryValid || !metadataValid || !nameValid}
      <div class="alert alert-warning text-xs">
        <ul class="list-disc list-inside">
          {#if !nameValid}
            <li>Gateway name is required.</li>
          {/if}
          {#if !factoryValid}
            <li>Factory address is invalid.</li>
          {/if}
          {#if !metadataValid}
            <li>Metadata digest must be a 0x-prefixed 32-byte hex string.</li>
          {/if}
        </ul>
      </div>
    {/if}

    <div class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        class="btn btn-ghost"
        onclick={popupControls.back}
      >
        Back
      </button>
      <button
        type="button"
        class="btn btn-primary"
        onclick={createGateway}
        disabled={!canSubmit}
      >
        Create gateway
      </button>
    </div>
  </div>
</FlowDecoration>
