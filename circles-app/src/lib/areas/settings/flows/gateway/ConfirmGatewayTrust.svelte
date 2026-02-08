<script lang="ts">
  import { ethers } from 'ethers';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ActionButton from '$lib/shared/ui/common/ActionButton.svelte';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    gateway: string;
    trustReceiver: string;
    onTrusted?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, onTrusted }: Props = $props();

  const gatewayAbi = ['function setTrust(address trustReceiver, uint192 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);

  const trustExpiryMax = (1n << 192n) - 1n;

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
  const canSet = $derived(gatewayValid && trustReceiverValid);

  async function setTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canSet) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    await runTask({
      name: 'Updating trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          trustExpiryMax
        ]);
        const tx = await $wallet.sendTransaction!({
          to: gateway,
          value: 0n,
          data
        });
        await $wallet.provider.waitForTransaction(tx.hash);
        await onTrusted?.();
        popupControls.close();
      })()
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <div class="flex flex-col gap-1">
      <div class="text-sm font-semibold">Confirm trust</div>
      <p class="text-xs text-base-content/70">
        This payment gateway will trust the following account.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <Avatar address={trustReceiver} view="horizontal" clickable={false} bottomInfo={trustReceiver} showTypeInfo={true} />
    </div>

    <div class="flex justify-end">
      <ActionButton action={setTrust} disabled={!canSet} title="Confirm trust">
        {#snippet children()}Confirm{/snippet}
      </ActionButton>
    </div>
  </div>
</FlowDecoration>