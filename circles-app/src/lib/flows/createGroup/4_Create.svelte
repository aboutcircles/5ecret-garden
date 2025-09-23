<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import { circles } from '$lib/stores/circles';
    import { wallet } from '$lib/stores/wallet.svelte';
    import { runTask } from '$lib/utils/tasks';
    import { popupControls } from '$lib/stores/popUp';
    import { cidV0ToUint8Array } from '@circles-sdk/utils';
    import { isValidName, isValidSymbol } from '$lib/utils/isValid';
    import {
        createGroupContext,
        type CreateGroupFlowContext,
        resetCreateGroupContext
    } from './context';
  import type { AddressLike } from 'ethers';

    interface Props {
        context?: CreateGroupFlowContext;
        setGroup?: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => void;
    }

    let { context, setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);

    function extractAddressFromTopic(topic: string | undefined): string | null {
        const looksRight: boolean = typeof topic === 'string' && topic.startsWith('0x') && topic.length === 66;
        if (!looksRight) { return null; }
        const addr = '0x' + topic.slice(26);
        return addr.toLowerCase();
    }

    async function createGroup() {
        const hasSdk: boolean = !!$circles;
        const hasWallet: boolean = !!$wallet?.address;
        const nameOk: boolean = isValidName(ctx.profile.name);
        const symbolOk: boolean = isValidSymbol(ctx.profile.symbol);

        if (!hasSdk) { throw new Error('SDK not initialized'); }
        if (!hasWallet) { throw new Error('Wallet not connected'); }
        if (!nameOk || !symbolOk) { throw new Error('Invalid name or symbol'); }

        popupControls.close();

        await runTask({
            name: `Creating ${ctx.profile.symbol} group …`,
            promise: (async () => {
                if (!$circles) { throw new Error('SDK not initialized'); }
                if (!$wallet) { throw new Error('Wallet not initialized'); }
                const CID = await $circles.profiles?.create(ctx.profile);
                if (!CID) { throw new Error('Failed to create profile CID'); }
                ctx.cid = CID;

                console.log($wallet.address, ctx);
                const tx = await $circles.baseGroupFactory?.createBaseGroup(
                    $wallet.address as AddressLike,
                    ctx.service,
                    ctx.feeCollection,
                    ctx.initialConditions,
                    ctx.profile.name,
                    ctx.profile.symbol,
                    cidV0ToUint8Array(CID)
                );
                if (!tx) { throw new Error('Failed to submit createBaseGroup transaction'); }

                const receipt = await tx.wait();
                const logs = (receipt as any)?.logs ?? [];
                let groupAddress: string | null = null;

                for (const log of logs) {
                    const topic = (log?.topics && log.topics[1]) as string | undefined;
                    const addr = extractAddressFromTopic(topic);
                    const ok: boolean = !!addr && addr.length === 42;
                    if (ok) { groupAddress = addr!; break; }
                }

                if (!groupAddress) { throw new Error('Could not extract group address from receipt'); }

                // Notify caller (e.g., ConnectCircles) so it can connect the new group and navigate
                try {
                    setGroup?.(groupAddress);
                } catch (e) {
                    console.error('setGroup callback failed', e);
                }

                // Reset context so a new flow starts clean next time
                resetCreateGroupContext($wallet.address as `0x${string}`);

                return groupAddress;
            })()
        });

        popupControls.close();
    }

    const hasDesc: boolean = $derived(!!ctx.profile.description && ctx.profile.description.trim().length > 0);
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">We’ll write your profile and deploy the group as a task.</p>

    <!-- Simple summary, row-by-row -->
    <div class="mt-4 space-y-1">
        <div><span class="text-base-content/70 mr-1">Name:</span>{ctx.profile.name}</div>
        <div><span class="text-base-content/70 mr-1">Symbol:</span>{ctx.profile.symbol}</div>
        <div class="truncate"><span class="text-base-content/70 mr-1">Service:</span>{ctx.service}</div>
        <div class="truncate"><span class="text-base-content/70 mr-1">Fee collection:</span>{ctx.feeCollection}</div>
        <div><span class="text-base-content/70 mr-1">Initial conditions:</span>{ctx.initialConditions.length}</div>
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
            <img src={ctx.profile.previewImageUrl} alt="Group image" class="w-32 h-32 rounded object-cover" />
        {/if}
    </div>

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary text-white" onclick={createGroup}>
            Confirm & Create
        </button>
    </div>
</FlowDecoration>
