<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  //@todo check if works correctly
  import { cidV0ToUint8Array } from '@aboutcircles/sdk-utils';
  import { isValidName, isValidSymbol } from '$lib/shared/utils/isValid';
  import {
    createGroupContext,
    type CreateGroupFlowContext,
    resetCreateGroupContext,
  } from './context';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    context?: CreateGroupFlowContext;
    setGroup?: (address: string) => void;
  }

  let { context, setGroup }: Props = $props();

  let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);

  function extractAddressFromTopic(topic: string | undefined): string | null {
    if (typeof topic !== 'string' || !topic.startsWith('0x') || topic.length !== 66) {
      return null;
    }
    const addr = '0x' + topic.slice(26);
    return addr.toLowerCase();
  }

  async function createGroup() {
    const hasSdk: boolean = !!$circles;
    const hasWallet: boolean = !!$wallet?.address;
    const hasRunner: boolean = !!$circles?.contractRunner;
    const nameOk: boolean = isValidName(ctx.profile.name);
    const symbolOk: boolean = isValidSymbol(ctx.profile.symbol);

    if (!hasSdk) {
      throw new Error('SDK not initialized');
    }
    if (!hasWallet) {
      throw new Error('Wallet not connected');
    }
    if (!hasRunner) {
      throw new Error('Contract runner not available');
    }
    if (!nameOk || !symbolOk) {
      throw new Error('Invalid name or symbol');
    }

    popupControls.close();

    await runTask({
      name: `Creating ${ctx.profile.symbol} group …`,
      promise: (async () => {
        if (!$circles) {
          throw new Error('SDK not initialized');
        }
        if (!$wallet) {
          throw new Error('Wallet not initialized');
        }
        if (!$circles.contractRunner) {
          throw new Error('Contract runner not available');
        }

        // 1. Create profile on IPFS
        // Note: profilesClient is private in SDK, but Profiles is exposed in the profiles package
        // We need to use the Profiles class directly
        const { Profiles } = await import('@aboutcircles/sdk-profiles');
        const profilesService = new Profiles(
          $circles.circlesConfig.profileServiceUrl
        );
        const CID = await profilesService.create(ctx.profile);
        if (!CID) {
          throw new Error('Failed to create profile CID');
        }
        ctx.cid = CID;

        // 2. Convert CID to bytes32 hex
        const metadataDigest = cidV0ToUint8Array(CID);
        const metadataHex =
          '0x' +
          Array.from(metadataDigest)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        console.log('Creating group with:', {
          owner: $wallet.address,
          service: ctx.service,
          feeCollection: ctx.feeCollection,
          conditions: ctx.initialConditions,
          name: ctx.profile.name,
          symbol: ctx.profile.symbol,
          metadataDigest: metadataHex,
        });

        // 3. Create transaction request using core.baseGroupFactory
        const txRequest = $circles.core.baseGroupFactory.createBaseGroup(
          $wallet.address as Address,
          ctx.service as Address,
          ctx.feeCollection as Address,
          ctx.initialConditions,
          ctx.profile.name,
          ctx.profile.symbol,
          metadataHex as `0x${string}`
        );

        // 4. Send transaction through contract runner
        const receipt = await $circles.contractRunner.sendTransaction!([
          txRequest,
        ]);
        console.log('Group creation receipt:', receipt);

        // 5. Extract group address from logs
        const logs = (receipt as any)?.logs ?? [];
        let groupAddress: string | null = null;

        for (const log of logs) {
          const topic = (log?.topics && log.topics[1]) as string | undefined;
          const addr = extractAddressFromTopic(topic);
          const ok: boolean = !!addr && addr.length === 42;
          if (ok) {
            groupAddress = addr!;
            break;
          }
        }

        if (!groupAddress) {
          throw new Error('Could not extract group address from receipt');
        }

        // 6. Notify caller so it can connect the new group and navigate
        try {
          setGroup?.(groupAddress);
        } catch (e) {
          console.error('setGroup callback failed', e);
        }

        // 7. Reset context so a new flow starts clean next time
        resetCreateGroupContext($wallet.address as `0x${string}`);

        return groupAddress;
      })(),
    });

    popupControls.close();
  }

  const hasDesc: boolean = $derived(
    !!ctx.profile.description && ctx.profile.description.trim().length > 0
  );
</script>

<FlowDecoration>
  <p class="text-sm text-base-content/70 mt-1">
    We’ll write your profile and deploy the group as a task.
  </p>

  <!-- Simple summary, row-by-row -->
  <div class="mt-4 space-y-1">
    <div>
      <span class="text-base-content/70 mr-1">Name:</span>{ctx.profile.name}
    </div>
    <div>
      <span class="text-base-content/70 mr-1">Symbol:</span>{ctx.profile.symbol}
    </div>
    <div class="truncate">
      <span class="text-base-content/70 mr-1">Service:</span>{ctx.service}
    </div>
    <div class="truncate">
      <span class="text-base-content/70 mr-1">Fee collection:</span
      >{ctx.feeCollection}
    </div>
    <div>
      <span class="text-base-content/70 mr-1">Initial conditions:</span>{ctx
        .initialConditions.length}
    </div>
  </div>

  {#if hasDesc}
    <div class="mt-3">
      <div class="text-base-content/70 mb-0.5">Description</div>
      <div class="whitespace-pre-wrap">{ctx.profile.description}</div>
    </div>
  {/if}

  <!-- Optional image -->
  <div class="mt-4">
    {#if ctx.profile.previewImageUrl}
      <img
        src={ctx.profile.previewImageUrl}
        alt="Group image"
        class="w-32 h-32 rounded object-cover"
      />
    {/if}
  </div>

  <div class="mt-5 flex justify-end">
    <button
      type="button"
      class="btn btn-primary text-white"
      onclick={createGroup}
    >
      Confirm & Create
    </button>
  </div>
</FlowDecoration>
