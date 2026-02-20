<script lang="ts">
  import { ethers } from 'ethers';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { GATEWAY_UNTRUST_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { isAddress } from '$lib/shared/utils/tx';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    gateway: string;
    trustReceiver: string;
    onDone?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, onDone }: Props = $props();

  const gatewayAbi = [
    'function setTrust(address trustReceiver, uint96 expiry)',
    'function clearTrust(address trustReceiver)'
  ];
  const gatewayIface = new ethers.Interface(gatewayAbi);

  const gatewayValid = $derived(isAddress((gateway ?? '').trim()));
  const trustReceiverValid = $derived(isAddress((trustReceiver ?? '').trim()));
  const walletConnected = $derived(Boolean($wallet));
  const canClear = $derived(walletConnected && gatewayValid && trustReceiverValid);

  async function clearTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canClear) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    const runner: any = $wallet;
    const gatewayAddress = gateway as `0x${string}`;

    await runTask({
      name: 'Clearing trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('clearTrust', [trustReceiver]);
        const tx = await runner.sendTransaction({
          to: gatewayAddress,
          value: 0n,
          data
        });
        await runner.provider.waitForTransaction(tx.hash);
        await onDone?.();
        popupControls.close();
      })()
    });
  }

  function changeAccount() {
    popupControls.back();
  }
</script>

<FlowStepScaffold
  {...GATEWAY_UNTRUST_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Remove trust"
  subtitle="Review receiver details before revoking trust."
>

  <div class="space-y-4">
    <StepSection
      title="Remove trust"
      subtitle="This will revoke trust for the following account."
    >
      <Avatar address={trustReceiver as Address} view="horizontal" clickable={false} bottomInfo={trustReceiver} showTypeInfo={true} />
      <div class="text-xs text-base-content/60">Gateway</div>
      <Avatar address={gateway as Address} view="horizontal" clickable={false} bottomInfo={gateway} showTypeInfo={true} />

      {#if !walletConnected}
        <StepAlert
          variant="warning"
          message="Connect your wallet to remove trust."
        />
      {/if}

      {#if !gatewayValid || !trustReceiverValid}
        <StepAlert
          variant="warning"
          message="Please provide valid gateway and receiver addresses before removing trust."
        />
      {/if}
    </StepSection>

    <StepActionBar>
      {#snippet secondary()}
        <button type="button" class="btn btn-ghost btn-sm" onclick={changeAccount}>
          Change account
        </button>
      {/snippet}

      {#snippet primary()}
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
      {/snippet}
    </StepActionBar>
  </div>
  </FlowStepScaffold>
