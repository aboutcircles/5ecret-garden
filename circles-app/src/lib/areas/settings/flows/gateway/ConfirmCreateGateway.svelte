<script lang="ts">
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { popupControls } from '$lib/shared/state/popup';
  import type { CreateGatewayFlowContext } from './context';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { getProfilesBindings } from '$lib/areas/market/offers';
  import { ensureProfileShape, cidV0ToDigest32Strict } from '@circles-profile/core';
  import { isValidOnChainName } from '$lib/shared/utils/isValid';
  import ActionButton from '$lib/shared/ui/common/ActionButton.svelte';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';

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

  const factoryValid = $derived(isAddress(context.factoryAddress));
  const trimmedGatewayName = $derived((context.gatewayName ?? '').trim());
  const nameValid = $derived(trimmedGatewayName.length > 0 && isValidOnChainName(trimmedGatewayName));
  const profileNameValid = $derived((context.profile?.name ?? '').trim().length > 0);

  const canSubmit = $derived(factoryValid && nameValid && profileNameValid);

  function getBindings() {
    return getProfilesBindings({ pinApiBase: gnosisConfig.production.marketApiBase }).bindings;
  }

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

        const bindings = getBindings();

        const profilePayload = ensureProfileShape({
          '@context': 'https://aboutcircles.com/contexts/circles-profile/',
          '@type': 'Profile',
          name: context.profile?.name ?? '',
          description: context.profile?.description ?? '',
          imageUrl: context.profile?.imageUrl || undefined,
          previewImageUrl: context.profile?.previewImageUrl || undefined,
          namespaces: {},
          signingKeys: {},
        });

        const profileCid = await (bindings as any).putJsonLd(profilePayload);

        if (!profileCid) {
          throw new Error('Failed to pin gateway profile metadata.');
        }

        context.metadataDigest = cidV0ToDigest32Strict(profileCid);

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
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content/60">On-chain name</span>
        <span class="text-lg font-semibold">{context.gatewayName}</span>
      </div>
      <div class="text-sm">
        <div class="text-base-content/70">Factory</div>
        <div class="font-mono break-all">{context.factoryAddress}</div>
      </div>
    </div>

    <div class="bg-base-100 border border-base-300 rounded-xl p-4 space-y-3">
      <div class="text-sm font-semibold">Gateway profile</div>

      <div class="flex items-start gap-4">
        <div class="w-24 h-24 rounded-lg bg-base-200 overflow-hidden flex items-center justify-center text-base-content/50">
          {#if context.profile?.previewImageUrl}
            <img
              src={context.profile.previewImageUrl}
              alt="Profile"
              class="w-full h-full object-cover"
            />
          {:else if context.profile?.imageUrl}
            <img
              src={context.profile.imageUrl}
              alt="Profile"
              class="w-full h-full object-cover"
            />
          {:else}
            No image
          {/if}
        </div>

        <div class="flex-1 space-y-2">
          <div>
            <div class="text-base-content/70 mb-0.5">Name</div>
            <div class="text-sm">{context.profile?.name || '—'}</div>
          </div>

          {#if context.profile?.description}
            <div>
              <div class="text-base-content/70 mb-0.5">Description</div>
              <Markdown content={context.profile.description} class="prose prose-sm max-w-none" />
            </div>
          {:else}
            <div>
              <div class="text-base-content/70 mb-0.5">Description</div>
              <div class="text-sm text-base-content/50">No description provided.</div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if !factoryValid || !nameValid || !profileNameValid}
      <div class="alert alert-warning text-xs">
        <ul class="list-disc list-inside">
          {#if !nameValid}
            <li>On-chain name is required and must follow the on-chain naming rules.</li>
          {/if}
          {#if !profileNameValid}
            <li>Gateway profile name is required.</li>
          {/if}
          {#if !factoryValid}
            <li>Factory address is invalid.</li>
          {/if}
        </ul>
      </div>
    {/if}

    <div class="mt-4 flex justify-end">
      <ActionButton
        action={createGateway}
        disabled={!canSubmit}
        title="Create gateway"
      >
        {#snippet children()}Create gateway{/snippet}
      </ActionButton>
    </div>
  </div>
</FlowDecoration>
