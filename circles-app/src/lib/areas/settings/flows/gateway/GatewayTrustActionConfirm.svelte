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
    mode: 'trust' | 'untrust';
    onComplete?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, mode, onComplete }: Props = $props();

  const gatewayAbi = ['function setTrust(address trustReceiver, uint192 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);
  const trustExpiryMax = (1n << 192n) - 1n;
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
  const canSubmit = $derived(gatewayValid && trustReceiverValid);

  const title = $derived(mode === 'trust' ? 'Confirm trust' : 'Remove trust');
  const description = $derived(
    mode === 'trust'
      ? 'This payment gateway will trust the following account.'
      : 'This will revoke trust for the following account.',
  );
  const taskName = $derived(mode === 'trust' ? 'Updating trust…' : 'Clearing trust…');
  const buttonTitle = $derived(mode === 'trust' ? 'Confirm trust' : 'Remove trust');
  const buttonLabel = $derived(mode === 'trust' ? 'Confirm' : 'Remove');

  const untrustTheme = {
    Ready: 'btn-error',
    Working: 'btn-disabled',
    Error: 'btn-warning',
    Retry: 'btn-warning',
    Done: 'btn-success',
    Disabled: 'btn-disabled'
  };

  async function submit() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canSubmit) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    const runner: any = $wallet;
    const gatewayAddress = gateway as `0x${string}`;

    await runTask({
      name: taskName,
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          mode === 'trust' ? trustExpiryMax : nowSeconds()
        ]);
        const tx = await runner.sendTransaction({
          to: gatewayAddress,
          value: 0n,
          data
        });
        await runner.provider.waitForTransaction(tx.hash);
        await onComplete?.();
        popupControls.close();
      })()
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <div class="flex flex-col gap-1">
      <div class="text-sm font-semibold">{title}</div>
      <p class="text-xs text-base-content/70">{description}</p>
    </div>

    <div class="flex flex-col gap-2">
      <Avatar address={trustReceiver} view="horizontal" clickable={false} bottomInfo={trustReceiver} showTypeInfo={true} />
    </div>

    <div class="flex justify-end">
      <ActionButton
        action={submit}
        disabled={!canSubmit}
        title={buttonTitle}
        theme={mode === 'untrust' ? untrustTheme : undefined}
      >
        {#snippet children()}{buttonLabel}{/snippet}
      </ActionButton>
    </div>
  </div>
</FlowDecoration>
