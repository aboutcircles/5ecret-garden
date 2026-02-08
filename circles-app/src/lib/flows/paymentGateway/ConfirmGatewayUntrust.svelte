<script lang="ts">
  import { ethers } from 'ethers';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    gateway: string;
    trustReceiver: string;
    onDone?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, onDone }: Props = $props();

  const gatewayAbi = ['function setTrust(address trustReceiver, uint192 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);

  const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000));

  function isAddress(v: string): boolean {
    try {
      ethers.getAddress((v || '').trim());
      return true;
    } catch {
      return false;
    }
  }

  const gatewayValid = $derived(isAddress(gateway));
  const trustReceiverValid = $derived(isAddress(trustReceiver));
  const canClear = $derived(gatewayValid && trustReceiverValid);

  async function clearTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canClear) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    await runTask({
      name: 'Clearing trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          nowSeconds()
        ]);
        const tx = await $wallet.sendTransaction!({
          to: gateway,
          value: 0n,
          data
        });
        await $wallet.provider.waitForTransaction(tx.hash);
        await onDone?.();
        popupControls.close();
      })()
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <div class="flex flex-col gap-1">
      <div class="text-sm font-semibold">Remove trust</div>
      <p class="text-xs text-base-content/70">
        This will revoke trust for the following account.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <Avatar address={trustReceiver} view="horizontal" clickable={false} bottomInfo={trustReceiver} showTypeInfo={true} />
    </div>

    <div class="flex justify-end">
      <ActionButton
        action={clearTrust}
        disabled={!canClear}
        title="Remove trust"
        theme={{
          Ready: 'btn-error',
          Working: 'btn-disabled',
          Error: 'btn-warning',
          Retry: 'btn-warning',
          Done: 'btn-success',
          Disabled: 'btn-disabled'
        }}
      >
        {#snippet children()}Remove{/snippet}
      </ActionButton>
    </div>
  </div>
</FlowDecoration>