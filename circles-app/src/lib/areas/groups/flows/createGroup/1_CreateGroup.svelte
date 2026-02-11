<script lang="ts">
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import OnChainNameSection from '$lib/shared/ui/flow/OnChainNameSection.svelte';
    import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
    import { ProfileFormStep } from '$lib/shared/ui/profile';
    import { isValidSymbol, isValidOnChainName } from '$lib/shared/utils/isValid';
    import { openFlowPopup } from '$lib/shared/state/popup';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import Settings from './2_Settings.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';
    import { resetCreateGroupContext } from './context';

    const PROFILE_NAME_MAX_LENGTH = 36;

    interface Props {
        /** Kept for compatibility; the store is the source of truth. */
        context?: CreateGroupFlowContext;
        setGroup?: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => void;
    }

    let { context = $bindable(), setGroup }: Props = $props();

    // Mirror store -> local state; keep them in sync.
    let ctx: CreateGroupFlowContext = $state($createGroupContext);

    // Default fee collection to current wallet once, if still zero.
    $effect(() => {
        const zero = '0x0000000000000000000000000000000000000000';
        const shouldDefaultFee: boolean = ctx.feeCollection === zero && !!$wallet?.address;
        if (shouldDefaultFee) {
            ctx.feeCollection = $wallet!.address as `0x${string}`;
        }
    });

    // If a parent hands a context, adopt it, but continue syncing via the store.
    $effect(() => {
        const hasIncoming: boolean = !!context && typeof context === 'object';
        if (hasIncoming) {
            ctx = context as CreateGroupFlowContext;
        }
    });

    // Persist every edit (including nested profile)
    $effect(() => {
        createGroupContext.set({ ...ctx, profile: { ...ctx.profile } });
    });

    // Validation / UI state
    const displayName = $derived(ctx.profile.name ?? '');
    const onChainName = $derived(ctx.profile.onChainName ?? '');
    const profileNameTrimmed = $derived(displayName.trim());
    const profileNameValid: boolean = $derived(
        profileNameTrimmed.length > 0 && profileNameTrimmed.length <= PROFILE_NAME_MAX_LENGTH
    );
    const symbolHasInput: boolean = $derived(ctx.profile.symbol.trim().length > 0);
    const symbolValidNow: boolean = $derived(isValidSymbol(ctx.profile.symbol));
    const showSymbolInvalid: boolean = $derived(symbolHasInput && !symbolValidNow);
    const trimmedOnChainName = $derived(onChainName.trim());
    const onChainNameHasInput = $derived(trimmedOnChainName.length > 0);
    const onChainNameValid = $derived(onChainNameHasInput && isValidOnChainName(trimmedOnChainName));
    const canContinue: boolean = $derived(profileNameValid && symbolValidNow && onChainNameValid);

    function next() {
        const ready: boolean = canContinue;
        if (!ready) { return; }
        openFlowPopup({
            title: 'Group Settings',
            component: Settings,
            props: { context: ctx, setGroup },
            onClose: () => {
                // ensure flow state is cleared when closing at any step
                resetCreateGroupContext();
            }
        });
    }
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">Name, symbol, description and image.</p>

    <div class="space-y-4">
        <label class="form-control">
            <div class="label">
                <span class="label-text">Symbol <Tooltip content="Short currency symbol (e.g., CRC)." /></span>
            </div>
            <input
                required
                type="text"
                class="input input-sm input-bordered w-full"
                bind:value={ctx.profile.symbol}
                placeholder="CRC…"
            />
            <div class="h-5 text-xs text-error pt-1">{#if showSymbolInvalid}Invalid symbol{/if}</div>
        </label>

        <div class="space-y-2">
            <div class="text-sm font-semibold">Group profile</div>

            <ProfileFormStep
                bind:name={ctx.profile.name}
                bind:description={ctx.profile.description}
                bind:previewImageUrl={ctx.profile.previewImageUrl}
                bind:imageUrl={ctx.profile.imageUrl}
                nameLabel="Profile name"
                showSubmit={false}
            />
            <div class="h-5 text-xs text-error pt-1">
                {#if !profileNameValid}
                    Profile name is required and must be at most {PROFILE_NAME_MAX_LENGTH} characters.
                {/if}
            </div>
        </div>

        <OnChainNameSection
            bind:value={ctx.profile.onChainName}
            sourceValue={displayName}
            placeholder="Group on-chain name…"
            invalid={onChainNameHasInput && !onChainNameValid}
        />
    </div>

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary" disabled={!canContinue} onclick={next}>
            Continue
        </button>
    </div>
</FlowDecoration>
