<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import { CREATE_GROUP_FLOW_SCAFFOLD_BASE } from './constants';
    import OnChainNameSection from '$lib/shared/ui/flow/OnChainNameSection.svelte';
    import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
    import { ProfileFormStep } from '$lib/shared/ui/profile';
    import { isValidSymbol, isValidOnChainName } from '$lib/shared/utils/isValid';
    import { openStep } from '$lib/shared/flow';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import Settings from './2_Settings.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';
    import { resetCreateGroupContext } from './context';
    import type { ProfileEditStepProps } from '$lib/shared/flow';

    const PROFILE_NAME_MAX_LENGTH = 36;

    type Props = Partial<ProfileEditStepProps<CreateGroupFlowContext>> & {
        /** Kept for compatibility; the store is the source of truth. */
        setGroup?: (address: string) => void;
    };

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
        openStep({
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

<FlowStepScaffold
  {...CREATE_GROUP_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Create group"
  subtitle="Choose simple defaults or configure advanced group settings."
>

    <p style="font-size:12.5px;color:{T.inkMuted};margin:0;">Name, symbol, description and image.</p>

    <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Symbol -->
        <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;display:flex;align-items:center;gap:4px;">
                Symbol <Tooltip content="Short currency symbol (e.g., CRC)." />
            </label>
            <input
                required
                type="text"
                style="
                    width:100%;padding:10px 14px;border:1px solid {showSymbolInvalid ? T.negative : T.hairline};border-radius:10px;
                    font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};
                    box-sizing:border-box;transition:border-color .15s ease-out;
                "
                bind:value={ctx.profile.symbol}
                placeholder="CRC…"
                data-popup-initial-input
            />
            {#if showSymbolInvalid}
                <div style="font-size:11.5px;color:{T.negative};">Invalid symbol</div>
            {/if}
        </div>

        <!-- Group profile -->
        <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">Group profile</div>
            <ProfileFormStep
                bind:name={ctx.profile.name}
                bind:description={ctx.profile.description}
                bind:previewImageUrl={ctx.profile.previewImageUrl}
                bind:imageUrl={ctx.profile.imageUrl}
                nameLabel="Profile name"
                showSubmit={false}
            />
            {#if !profileNameValid && profileNameTrimmed.length > 0}
                <div style="font-size:11.5px;color:{T.negative};">Profile name is required (max {PROFILE_NAME_MAX_LENGTH} chars).</div>
            {/if}
        </div>

        <OnChainNameSection
            bind:value={ctx.profile.onChainName}
            sourceValue={displayName}
            placeholder="Group on-chain name…"
            invalid={onChainNameHasInput && !onChainNameValid}
        />
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button
            type="button"
            style="
                height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:{canContinue ? 'pointer' : 'not-allowed'};
                background:{canContinue ? T.primary : T.pageDeep};color:{canContinue ? '#fff' : T.inkMuted};
                font-family:{T.fontSans};font-size:14px;font-weight:580;
                box-shadow:{canContinue ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};
            "
            disabled={!canContinue}
            onclick={next}
        >Continue</button>
    </div>
    </FlowStepScaffold>
