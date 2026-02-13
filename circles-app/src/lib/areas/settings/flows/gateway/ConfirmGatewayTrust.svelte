<script lang="ts">
  import { ethers } from 'ethers';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import { openStep } from '$lib/shared/flow/runtime';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { isAddress } from '$lib/shared/utils/tx';
  import { popupControls } from '$lib/shared/state/popup';
  import SearchTrustReceiver from './SearchTrustReceiver.svelte';

  interface Props {
    gateway: string;
    trustReceiver: string;
    onTrusted?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, onTrusted }: Props = $props();

  const gatewayAbi = ['function setTrust(address trustReceiver, uint96 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);

  const trustExpiryMax = (1n << 96n) - 1n;

  const gatewayValid = $derived(isAddress((gateway ?? '').trim()));
  const trustReceiverValid = $derived(isAddress((trustReceiver ?? '').trim()));
  const walletConnected = $derived(Boolean($wallet));
  const canSet = $derived(walletConnected && gatewayValid && trustReceiverValid);

  async function setTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canSet) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    const runner: any = $wallet;
    const gatewayAddress = gateway as `0x${string}`;

    await runTask({
      name: 'Updating trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          trustExpiryMax
        ]);
        const tx = await runner.sendTransaction({
          to: gatewayAddress,
          value: 0n,
          data
        });
        await runner.provider.waitForTransaction(tx.hash);
        await onTrusted?.();
        popupControls.close();
      })()
    });
  }

  function changeAccount() {
    const didPop = popupControls.popTo((entry) => entry.component === SearchTrustReceiver);
    if (!didPop) {
      openStep({
        title: 'Search account',
        component: SearchTrustReceiver,
        props: { gateway, onTrusted },
      });
    }
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={2}
      total={2}
      title="Confirm trust"
      subtitle="Review receiver details before updating trust."
      labels={['Search account', 'Confirm trust']}
    />

  <div class="space-y-4">
    <StepSection
      title="Confirm trust"
      subtitle="This payment gateway will trust the following account."
    >
      <Avatar address={trustReceiver} view="horizontal" clickable={false} bottomInfo={trustReceiver} showTypeInfo={true} />

      {#if !walletConnected}
        <StepAlert
          variant="warning"
          message="Connect your wallet to confirm trust updates."
        />
      {/if}

      {#if !gatewayValid || !trustReceiverValid}
        <StepAlert
          variant="warning"
          message="Please provide valid gateway and receiver addresses before confirming."
        />
      {/if}
    </StepSection>

    <StepActionBar>
      {#snippet secondary()}
        <button type="button" class="btn btn-ghost" onclick={changeAccount}>
          Change account
        </button>
      {/snippet}

      {#snippet primary()}
        <ActionButton action={setTrust} disabled={!canSet} title="Confirm trust">
          {#snippet children()}Confirm{/snippet}
        </ActionButton>
      {/snippet}
    </StepActionBar>
  </div>
  </div>
</FlowDecoration>