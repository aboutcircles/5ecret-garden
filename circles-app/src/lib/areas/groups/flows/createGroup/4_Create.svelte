<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
    import { CREATE_GROUP_FLOW_SCAFFOLD_BASE } from './constants';
    import { circles } from '$lib/shared/state/circles';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import { runTask } from '$lib/shared/utils/tasks';
    import { popupControls } from '$lib/shared/state/popup';
    import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
    import { cidV0ToUint8Array } from '@circles-sdk/utils';
    import { isValidSymbol, isValidOnChainName } from '$lib/shared/utils/isValid';
    import {
        createGroupContext,
        type CreateGroupFlowContext,
        resetCreateGroupContext
    } from './context';
    import { assertWalletCanSignForSafe } from '$lib/shared/integrations/safe/assertWalletCanSignForSafe';
  import type { AddressLike } from 'ethers';
    import AdvancedDetails from '$lib/shared/ui/flow/AdvancedDetails.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';

    const PROFILE_NAME_MAX_LENGTH = 36;

    interface Props {
        context?: CreateGroupFlowContext;
        setGroup?: (address: string) => void;
    }

    let { context = $bindable(), setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state($createGroupContext);
    $effect(() => {
        const hasIncoming = !!context && typeof context === 'object';
        if (hasIncoming) {
            ctx = context as CreateGroupFlowContext;
        }
    });

    function extractAddressFromTopic(topic: string | undefined): string | null {
        const looksRight: boolean = typeof topic === 'string' && topic.startsWith('0x') && topic.length === 66;
        if (!looksRight) { return null; }
        const safeTopic = topic as string;
        const addr = '0x' + safeTopic.slice(26);
        return addr.toLowerCase();
    }

    async function createGroup() {
        const hasSdk: boolean = !!$circles;
        const hasWallet: boolean = !!$wallet?.address;
        const profileNameLength: number = (ctx.profile.name ?? '').trim().length;
        const profileNameOk: boolean = profileNameLength > 0 && profileNameLength <= PROFILE_NAME_MAX_LENGTH;
        const symbolOk: boolean = isValidSymbol(ctx.profile.symbol);
        const onChainOk: boolean = isValidOnChainName(onChainName);
        if (!hasSdk) { throw new Error('SDK not initialized'); }
        if (!hasWallet) { throw new Error('Wallet not connected'); }
        if (!profileNameOk || !symbolOk || !onChainOk) {
            throw new Error('Invalid profile name (required, max 36 chars), symbol, or on-chain name');
        }

        await runTask({
            name: `Creating ${ctx.profile.symbol} group …`,
            promise: (async () => {
                if (!$circles) { throw new Error('SDK not initialized'); }
                if (!$wallet) { throw new Error('Wallet not initialized'); }

                // Preflight for Safe-based signing flows to fail fast with a clear message.
                // Kept inside runTask so failures open the global dismissable error popup.
                await assertWalletCanSignForSafe(String($wallet.address));

                const CID = await $circles.profiles?.create(ctx.profile);
                if (!CID) { throw new Error('Failed to create profile CID'); }
                ctx.cid = CID;

                console.log($wallet.address, ctx);
                const tx = await $circles.baseGroupFactory?.createBaseGroup(
                    $wallet.address as AddressLike,
                    ctx.service,
                    ctx.feeCollection,
                    ctx.initialConditions,
                    onChainName,
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
    const onChainName = $derived(ctx.profile.onChainName ?? ctx.profile.name);
    const fastLane = $derived((ctx.settingsMode ?? 'fast') === 'fast');
</script>

<FlowStepScaffold
  {...CREATE_GROUP_FLOW_SCAFFOLD_BASE}
  step={3}
  title="Review"
  subtitle="Confirm details and create the group on-chain."
>

    <p class="text-sm text-base-content/70 mt-1">We’ll write your profile and deploy the group as a task.</p>

    <!-- Simple summary, row-by-row -->
    <div class="mt-4 space-y-1">
        <div><span class="text-base-content/70 mr-1">Name:</span>{ctx.profile.name}</div>
        <div><span class="text-base-content/70 mr-1">Symbol:</span>{ctx.profile.symbol}</div>
    </div>

    {#if hasDesc}
        <div class="mt-3">
            <div class="text-base-content/70 mb-0.5">Description</div>
            <Markdown content={ctx.profile.description} class="prose prose-sm max-w-none" />
        </div>
    {/if}

    <!-- Optional image -->
    <div class="mt-4">
        {#if ctx.profile.previewImageUrl}
            <img src={ctx.profile.previewImageUrl} alt="Group" class="w-32 h-32 rounded object-cover" />
        {/if}
    </div>

    <AdvancedDetails title="Advanced group details" subtitle="On-chain settings">
        <div><span class="text-base-content/70 mr-1">On-chain name:</span>{onChainName}</div>
        {#if !fastLane}
            <div class="text-xs text-base-content/60">Service</div>
            <Avatar address={ctx.service} view="horizontal" clickable={false} bottomInfo={ctx.service} showTypeInfo={true} />
            <div class="text-xs text-base-content/60">Fee collection</div>
            <Avatar address={ctx.feeCollection} view="horizontal" clickable={false} bottomInfo={ctx.feeCollection} showTypeInfo={true} />
            <div><span class="text-base-content/70 mr-1">Initial conditions:</span>{ctx.initialConditions.length}</div>
        {:else}
            <div class="text-sm text-base-content/70">Fast mode uses default service + fee collection.</div>
        {/if}
    </AdvancedDetails>

    <StepActionBar>
        {#snippet primary()}
            <button type="button" class="btn btn-primary btn-sm" onclick={createGroup}>
                Confirm & Create
            </button>
        {/snippet}
    </StepActionBar>
    </FlowStepScaffold>
