<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import Tooltip from '../../components/Tooltip.svelte';
    import ImageUpload from '../../components/ImageUpload.svelte';
    import { isValidName, isValidSymbol } from '$lib/utils/isValid';
    import { popupControls } from '$lib/stores/popUp';
    import { wallet } from '$lib/stores/wallet.svelte';
    import Settings from './2_Settings.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';

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
    const nameHasInput: boolean = $derived(ctx.profile.name.trim().length > 0);
    const symbolHasInput: boolean = $derived(ctx.profile.symbol.trim().length > 0);
    const nameValidNow: boolean = $derived(isValidName(ctx.profile.name));
    const symbolValidNow: boolean = $derived(isValidSymbol(ctx.profile.symbol));
    const showNameInvalid: boolean = $derived(nameHasInput && !nameValidNow);
    const showSymbolInvalid: boolean = $derived(symbolHasInput && !symbolValidNow);
    const canContinue: boolean = $derived(nameValidNow && symbolValidNow);

    function onnewimage(dataUrl: string) { ctx.profile.previewImageUrl = dataUrl; }
    function oncleared() { ctx.profile.previewImageUrl = ''; }

    function next() {
        const ready: boolean = canContinue;
        if (!ready) { return; }
        popupControls.open({
            title: 'Group Settings',
            component: Settings,
            props: { context: ctx, setGroup },
            onClose: () => {
                // ensure flow state is cleared when closing at any step
                import('./context').then(m => m.resetCreateGroupContext());
            }
        });
    }
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">Name, symbol, description and image.</p>

    <!-- Row: Name -->
    <label class="form-control mt-4">
        <div class="label">
            <span class="label-text">Name <Tooltip content="Enter a name for your group." /></span>
        </div>
        <input
                required
                type="text"
                class="input input-bordered w-full"
                bind:value={ctx.profile.name}
                placeholder="Group name…"
        />
        <div class="h-5 text-xs text-error pt-1">{#if showNameInvalid}Invalid name{/if}</div>
    </label>

    <!-- Row: Symbol -->
    <label class="form-control">
        <div class="label">
            <span class="label-text">Symbol <Tooltip content="Short currency symbol (e.g., CRC)." /></span>
        </div>
        <input
                required
                type="text"
                class="input input-bordered w-full"
                bind:value={ctx.profile.symbol}
                placeholder="CRC…"
        />
        <div class="h-5 text-xs text-error pt-1">{#if showSymbolInvalid}Invalid symbol{/if}</div>
    </label>

    <!-- Row: Description -->
    <label class="form-control">
        <div class="label">
            <span class="label-text">Description <Tooltip content="Brief description of your group." /></span>
        </div>
        <textarea
                class="textarea textarea-bordered w-full"
                rows="4"
                bind:value={ctx.profile.description}
                placeholder="What is this group about?"
        ></textarea>
    </label>

    <!-- Row: Image -->
    <div class="mt-2">
        <div class="label font-semibold mb-1 flex items-center gap-1">
            Group Image <Tooltip content="Upload a square logo (e.g. 256×256)." />
        </div>
        <ImageUpload
                imageDataUrl={ctx.profile.previewImageUrl}
                cropHeight={256}
                cropWidth={256}
                {onnewimage}
                {oncleared}
        />
    </div>

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary text-white" disabled={!canContinue} onclick={next}>
            Continue
        </button>
    </div>
</FlowDecoration>
