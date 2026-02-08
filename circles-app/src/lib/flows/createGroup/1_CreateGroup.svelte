<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import Tooltip from '../../components/Tooltip.svelte';
    import ProfileHeaderEditor from '$lib/domains/profile/ui/ProfileHeaderEditor.svelte';
    import { isValidName, isValidSymbol, isValidOnChainName } from '$lib/utils/isValid';
    import { popupControls } from '$lib/shared/state/popup';
    import { wallet } from '$lib/stores/wallet.svelte';
    import Settings from './2_Settings.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';
    import { resetCreateGroupContext } from './context';

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
    const nameHasInput: boolean = $derived(displayName.trim().length > 0);
    const symbolHasInput: boolean = $derived(ctx.profile.symbol.trim().length > 0);
    const nameValidNow: boolean = $derived(isValidName(displayName));
    const symbolValidNow: boolean = $derived(isValidSymbol(ctx.profile.symbol));
    const showNameInvalid: boolean = $derived(nameHasInput && !nameValidNow);
    const showSymbolInvalid: boolean = $derived(symbolHasInput && !symbolValidNow);
    const trimmedOnChainName = $derived(onChainName.trim());
    const onChainNameHasInput = $derived(trimmedOnChainName.length > 0);
    const onChainNameValid = $derived(onChainNameHasInput && isValidOnChainName(trimmedOnChainName));
    const canContinue: boolean = $derived(nameValidNow && symbolValidNow && onChainNameValid);

    let onChainNameOpen = $state(false);
    let onChainNameManual = $state(false);

    function truncateAscii(value: string, maxBytes: number): string {
        if (value.length <= maxBytes) {
            return value;
        }
        return value.slice(0, maxBytes);
    }

    function deriveOnChainName(value: string): string {
        const trimmed = (value ?? '').trim();
        if (!trimmed) return '';
        const sanitized = trimmed.replace(/[^0-9A-Za-z \-_.()'&+#]/g, '');
        return truncateAscii(sanitized, 32);
    }

    $effect(() => {
        if (!onChainNameManual) {
            ctx.profile.onChainName = deriveOnChainName(displayName);
        }
    });

    function toggleOnChainName(): void {
        onChainNameOpen = !onChainNameOpen;
    }

    function handleManualToggle(enabled: boolean): void {
        onChainNameManual = enabled;
        if (!enabled) {
            ctx.profile.onChainName = deriveOnChainName(displayName);
        }
    }

    function handleManualToggleChange(event: Event): void {
        const target = event.currentTarget as HTMLInputElement | null;
        handleManualToggle(target?.checked ?? false);
    }

    function next() {
        const ready: boolean = canContinue;
        if (!ready) { return; }
        popupControls.open({
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

            <ProfileHeaderEditor
                bind:name={ctx.profile.name}
                bind:description={ctx.profile.description}
                bind:previewImageUrl={ctx.profile.previewImageUrl}
                bind:imageUrl={ctx.profile.imageUrl}
                nameLabel="Profile name"
            />
            <div class="h-5 text-xs text-error pt-1">{#if showNameInvalid}Invalid name{/if}</div>
        </div>

        <div class="border border-base-200 rounded-xl p-3">
            <button
                type="button"
                class="flex items-center justify-between w-full text-xs font-semibold text-left"
                onclick={toggleOnChainName}
            >
                <span>On-chain name</span>
                <span class={onChainNameOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>
                    <img src="/chevron-down.svg" alt="Toggle" class="w-4 h-4" />
                </span>
            </button>

            <div class="mt-1 text-xs text-base-content/60">
                {#if ctx.profile.onChainName}
                    {ctx.profile.onChainName}
                {:else}
                    Derived from the profile name
                {/if}
            </div>

            {#if onChainNameOpen}
                <div class="mt-3 space-y-2">
                    <label class="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            class="checkbox checkbox-xs"
                            checked={onChainNameManual}
                            onchange={handleManualToggleChange}
                        />
                        Set on-chain name manually
                    </label>

                    <label class="form-control w-full">
                        <span class="label-text text-xs">On-chain name</span>
                        <input
                            class="input input-sm input-bordered w-full"
                            bind:value={ctx.profile.onChainName}
                            placeholder="Group on-chain name…"
                            disabled={!onChainNameManual}
                        />
                    </label>
                    <p class="text-xs text-base-content/60">
                        On-chain names follow stricter rules (ASCII only, max 32 characters).
                    </p>
                    {#if onChainNameHasInput && !onChainNameValid}
                        <p class="text-xs text-error">
                            Only ASCII letters, numbers, spaces, and - _ . ( ) ' & + # are allowed (max 32 chars).
                        </p>
                    {/if}
                </div>
            {/if}
        </div>
    </div>

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary" disabled={!canContinue} onclick={next}>
            Continue
        </button>
    </div>
</FlowDecoration>
