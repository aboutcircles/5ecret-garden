<script lang="ts">
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import { openFlowPopup } from '$lib/shared/state/popup';
    import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
    import CreateStep from './4_Create.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';
    import { resetCreateGroupContext } from './context';

    interface Props {
        context?: CreateGroupFlowContext;
        setGroup?: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => void;
    }

    let { context, setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);

    const hasImage: boolean = $derived(!!ctx.profile.previewImageUrl && ctx.profile.previewImageUrl.trim().length > 0);
    const hasDescription: boolean = $derived(!!ctx.profile.description && ctx.profile.description.trim().length > 0);
    const icCount: number = $derived(ctx.initialConditions.length);
    const fastLane: boolean = $derived((ctx.settingsMode ?? 'fast') === 'fast');

    function next() {
        openFlowPopup({
            title: 'Create Group',
            component: CreateStep,
            props: { context: ctx, setGroup },
            onClose: () => {
                resetCreateGroupContext();
            }
        });
    }
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">Confirm details before creating the group.</p>

    <div class="bg-base-100 border border-base-300 rounded-xl p-4 space-y-3 mt-4">
        <div class="flex flex-col gap-1">
            <span class="text-xs text-base-content/60">Symbol</span>
            <span class="text-lg font-semibold">{ctx.profile.symbol}</span>
        </div>
        <div class="text-sm">
            <div class="text-base-content/70">On-chain name</div>
            <div>{ctx.profile.onChainName ?? ctx.profile.name}</div>
        </div>
        {#if !fastLane}
            <div class="text-sm">
                <div class="text-base-content/70">Service</div>
                <div class="truncate">{ctx.service}</div>
            </div>
            <div class="text-sm">
                <div class="text-base-content/70">Fee collection</div>
                <div class="truncate">{ctx.feeCollection}</div>
            </div>
            <div class="text-sm">
                <div class="text-base-content/70">Initial conditions</div>
                <div>{icCount}</div>
            </div>
        {/if}
    </div>

    <div class="bg-base-100 border border-base-300 rounded-xl p-4 space-y-3 mt-4">
        <div class="text-sm font-semibold">Group profile</div>

        <div class="flex items-start gap-4">
            <div class="w-24 h-24 rounded-lg bg-base-200 overflow-hidden flex items-center justify-center text-base-content/50">
                {#if hasImage}
                    <img src={ctx.profile.previewImageUrl} alt="Group" class="w-full h-full object-cover" />
                {:else}
                    No image
                {/if}
            </div>

            <div class="flex-1 space-y-2">
                <div>
                    <div class="text-base-content/70 mb-0.5">Name</div>
                    <div class="text-sm">{ctx.profile.name}</div>
                </div>

                {#if hasDescription}
                    <div>
                        <div class="text-base-content/70 mb-0.5">Description</div>
                        <Markdown content={ctx.profile.description} class="prose prose-sm max-w-none" />
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

    {#if !fastLane}
        <div class="bg-base-100 border border-base-300 rounded-xl p-4 space-y-2 mt-4">
            <div class="text-sm font-semibold">Initial conditions ({icCount})</div>
            {#if icCount > 0}
                <div class="flex flex-wrap gap-2">
                    {#each ctx.initialConditions as addr}
                        <span class="badge badge-outline">{addr}</span>
                    {/each}
                </div>
            {:else}
                <div class="text-sm text-base-content/50">None</div>
            {/if}
        </div>
    {/if}

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary" onclick={next}>
            Create group
        </button>
    </div>
</FlowDecoration>
