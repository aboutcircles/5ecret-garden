<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import { popupControls } from '$lib/stores/popUp';
    import CreateStep from './4_Create.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';

    interface Props {
        context?: CreateGroupFlowContext;
        setGroup?: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => void;
    }

    let { context, setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);

    const hasImage: boolean = $derived(!!ctx.profile.previewImageUrl && ctx.profile.previewImageUrl.trim().length > 0);
    const hasDescription: boolean = $derived(!!ctx.profile.description && ctx.profile.description.trim().length > 0);
    const icCount: number = $derived(ctx.initialConditions.length);

    function next() {
        popupControls.open({
            title: 'Create Group',
            component: CreateStep,
            props: { context: ctx, setGroup },
            onClose: () => {
                import('./context').then(m => m.resetCreateGroupContext());
            }
        });
    }
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">Confirm details before creating the group.</p>

    <!-- Row: Image (optional) -->
    <div class="mt-4">
        {#if hasImage}
            <img src={ctx.profile.previewImageUrl} alt="Group image" class="w-32 h-32 rounded object-cover" />
        {:else}
            <div class="w-32 h-32 rounded bg-base-200 flex items-center justify-center text-base-content/50">
                No image
            </div>
        {/if}
    </div>

    <!-- Row: Basics -->
    <div class="mt-4 space-y-1">
        <div><span class="text-base-content/70 mr-1">Name:</span>{ctx.profile.name}</div>
        <div><span class="text-base-content/70 mr-1">Symbol:</span>{ctx.profile.symbol}</div>
    </div>

    {#if hasDescription}
        <div class="mt-3">
            <div class="text-base-content/70 mb-0.5">Description</div>
            <div class="whitespace-pre-wrap">{ctx.profile.description}</div>
        </div>
    {/if}

    <!-- Row: Settings -->
    <div class="mt-4 space-y-1">
        <div class="truncate"><span class="text-base-content/70 mr-1">Service:</span>{ctx.service}</div>
        <div class="truncate"><span class="text-base-content/70 mr-1">Fee collection:</span>{ctx.feeCollection}</div>
    </div>

    <!-- Row: Initial conditions -->
    <div class="mt-3">
        <div class="text-base-content/70 mb-1">Initial conditions ({icCount})</div>
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

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary text-white" onclick={next}>
            Create group
        </button>
    </div>
</FlowDecoration>
