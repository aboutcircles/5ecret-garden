<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
    import { CREATE_GROUP_FLOW_SCAFFOLD_BASE } from './constants';
    import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
    import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
    import { openStep, popToOrOpen } from '$lib/shared/flow';
    import { popupControls } from '$lib/shared/state/popup';
    import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
    import GroupProfileStep from './1_CreateGroup.svelte';
    import GroupSettingsStep from './2_Settings.svelte';
    import CreateStep from './4_Create.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';
    import { resetCreateGroupContext } from './context';
    import type { ReviewStepProps } from '$lib/shared/flow';

    type Props = Partial<ReviewStepProps<CreateGroupFlowContext>> & {
        setGroup?: (address: string) => void;
    };

    let { context = $bindable(), setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state($createGroupContext);
    $effect(() => {
        const hasIncoming = !!context && typeof context === 'object';
        if (hasIncoming) {
            ctx = context as CreateGroupFlowContext;
        }
    });

    const hasImage: boolean = $derived(!!ctx.profile.previewImageUrl && ctx.profile.previewImageUrl.trim().length > 0);
    const hasDescription: boolean = $derived(!!ctx.profile.description && ctx.profile.description.trim().length > 0);
    const icCount: number = $derived(ctx.initialConditions.length);
    const fastLane: boolean = $derived((ctx.settingsMode ?? 'fast') === 'fast');

    function next() {
        openStep({
            title: 'Create Group',
            component: CreateStep,
            props: { context: ctx, setGroup },
            onClose: () => {
                resetCreateGroupContext();
            }
        });
    }

    function editProfile() {
        popToOrOpen(GroupProfileStep, {
            title: 'Create Group',
            props: { context: ctx, setGroup },
        });
    }

    function editSettings() {
        popToOrOpen(GroupSettingsStep, {
            title: 'Group Settings',
            props: { context: ctx, setGroup },
        });
    }
</script>

<FlowStepScaffold
  {...CREATE_GROUP_FLOW_SCAFFOLD_BASE}
  step={3}
  title="Review"
  subtitle="Confirm group details before creation."
>

    <p class="text-sm text-base-content/70 mt-1">Confirm details before creating the group.</p>

    <StepSection className="mt-4" title="Group settings">
        <div class="space-y-3">
            <div class="flex flex-col gap-1">
                <span class="text-xs text-base-content/60">Symbol</span>
                <span class="text-lg font-semibold">{ctx.profile.symbol}</span>
            </div>

            <StepReviewRow
                label="Group profile"
                value={ctx.profile.name}
                onChange={editProfile}
                changeLabel="Edit"
            />

            <StepReviewRow label="On-chain name" value={ctx.profile.onChainName ?? ctx.profile.name} onChange={editProfile} changeLabel="Edit" />

            {#if !fastLane}
                <StepReviewRow label="Service" value={ctx.service} className="text-sm" onChange={editSettings} changeLabel="Edit" />
                <StepReviewRow label="Fee collection" value={ctx.feeCollection} className="text-sm" onChange={editSettings} changeLabel="Edit" />
                <StepReviewRow label="Initial conditions" value={String(icCount)} className="text-sm" onChange={editSettings} changeLabel="Edit" />
            {:else}
                <StepReviewRow label="Settings mode" value="Simple" className="text-sm" onChange={editSettings} changeLabel="Edit" />
            {/if}
        </div>
    </StepSection>

    <StepSection className="mt-4" title="Group profile">

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
    </StepSection>

    {#if !fastLane}
        <StepSection className="mt-4" title={`Initial conditions (${icCount})`}>
            {#if icCount > 0}
                <div class="flex flex-wrap gap-2">
                    {#each ctx.initialConditions as addr}
                        <span class="badge badge-outline">{addr}</span>
                    {/each}
                </div>
            {:else}
                <div class="text-sm text-base-content/50">None</div>
            {/if}
        </StepSection>
    {/if}

    <StepActionBar>
        {#snippet primary()}
            <button type="button" class="btn btn-primary btn-sm" onclick={next}>
                Create group
            </button>
        {/snippet}
    </StepActionBar>
    </FlowStepScaffold>
