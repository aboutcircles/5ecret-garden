<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { CreateGatewayFlowContext } from './context';
  import ConfirmCreateGateway from './ConfirmCreateGateway.svelte';

  interface Props {
    context?: CreateGatewayFlowContext;
    onCreated?: (gateway: string) => void;
  }

  let { context = $bindable(), onCreated }: Props = $props();

  let ctx: CreateGatewayFlowContext = $state(
    context ?? {
      factoryAddress: '',
      gatewayName: '',
      metadataDigest: ''
    }
  );

  // keep prop in sync if parent passes a context object
  $effect(() => {
    context = ctx;
  });

  onMount(() => {
    // Pre-fill factory from localStorage if present
    try {
      const savedFactory = localStorage.getItem('pg_factory');
      if (
        savedFactory &&
        savedFactory.startsWith('0x') &&
        savedFactory.length === 42 &&
        !ctx.factoryAddress
      ) {
        ctx.factoryAddress = savedFactory;
      }
    } catch {
      // ignore
    }
  });

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

  const hasName = $derived((ctx.gatewayName ?? '').trim().length > 0);
  const factoryValid = $derived(isAddress(ctx.factoryAddress));
  const metadataValid = $derived(isHex32(ctx.metadataDigest));

  const canContinue = $derived(hasName && factoryValid && metadataValid);

  function goNext() {
    if (!canContinue) {
      return;
    }
    popupControls.open({
      title: 'Confirm payment gateway',
      component: ConfirmCreateGateway,
      props: { context: ctx, onCreated }
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <p class="text-sm text-base-content/70">
      Define the basic details for your payment gateway.
    </p>

    <label class="form-control w-full">
      <span class="label-text">Factory address</span>
      <input
        class="input input-bordered w-full font-mono"
        bind:value={ctx.factoryAddress}
        placeholder="0x…"
      />
      <span
        class="text-xs mt-1"
        class:text-error={!factoryValid && ctx.factoryAddress}
        class:text-success={factoryValid}
      >
        {#if ctx.factoryAddress}
          {#if factoryValid}
            Looks good
          {:else}
            Invalid address
          {/if}
        {:else}
          Enter the Payment Gateway factory contract address
        {/if}
      </span>
    </label>

    <label class="form-control w-full">
      <span class="label-text">Gateway name</span>
      <input
        class="input input-bordered w-full"
        bind:value={ctx.gatewayName}
        placeholder="My Shop"
      />
    </label>

    <label class="form-control w-full">
      <span class="label-text">Metadata digest (bytes32)</span>
      <input
        class="input input-bordered w-full font-mono"
        bind:value={ctx.metadataDigest}
        placeholder="0x…64 hex chars"
      />
      <span
        class="text-xs mt-1"
        class:text-error={!metadataValid && ctx.metadataDigest}
        class:text-success={metadataValid}
      >
        {#if ctx.metadataDigest}
          {#if metadataValid}
            Looks like a 32-byte hex string
          {:else}
            Must be a 0x-prefixed 32-byte hex string
          {/if}
        {:else}
          Required: 0x-prefixed 32-byte hex string
        {/if}
      </span>
    </label>

    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="btn btn-primary"
        onclick={goNext}
        disabled={!canContinue}
      >
        Continue
      </button>
    </div>
  </div>
</FlowDecoration>
