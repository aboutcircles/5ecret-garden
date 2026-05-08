<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import { CREATE_GROUP_FLOW_SCAFFOLD_BASE } from './constants';
    import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import { ethers } from 'ethers';
    import { openStep } from '$lib/shared/flow';
    import ReviewStep from './4_Create.svelte';
    import { wallet } from '$lib/shared/state/wallet.svelte';
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

    // Keep a local mutable snapshot; adopt incoming context reactively when provided.
    let ctx: CreateGroupFlowContext = $state($createGroupContext);
    $effect(() => {
        const hasIncoming = !!context && typeof context === 'object';
        if (hasIncoming) {
            ctx = context as CreateGroupFlowContext;
        }
    });

    let initialConditionsStr: string = $state('');
    let mode: 'fast' | 'advanced' = $state('fast');
    let initializedFromContext = $state(false);

    $effect(() => {
        if (initializedFromContext) {
            return;
        }
        initialConditionsStr = (ctx.initialConditions ?? []).join(', ');
        mode = ctx.settingsMode ?? 'fast';
        initializedFromContext = true;
    });

    // Defaults
    $effect(() => {
        ctx.settingsMode = mode;
    });

    $effect(() => {
        if (mode === 'fast') {
            const zero = '0x0000000000000000000000000000000000000000';
            ctx.service = zero;
            ctx.initialConditions = [];
            if ($wallet?.address) {
                ctx.feeCollection = $wallet.address as `0x${string}`;
            } else {
                ctx.feeCollection = zero;
            }
            initialConditionsStr = '';
        }
    });

    // Persist edits to store
    $effect(() => {
        createGroupContext.set({
            ...ctx,
            profile: { ...ctx.profile },
            initialConditions: [...ctx.initialConditions]
        });
    });

    function parseAddresses(csv: string): { valid: `0x${string}`[]; invalid: string[] } {
        const parts = csv.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        const unique = Array.from(new Set(parts));
        const valid = unique.filter((addr) => ethers.isAddress(addr)) as `0x${string}`[];
        const invalid = unique.filter((addr) => !ethers.isAddress(addr));
        return { valid, invalid };
    }

    const parsed = $derived(parseAddresses(initialConditionsStr));
    const serviceLooksValid: boolean = $derived(typeof ctx.service === 'string' && ctx.service.length === 42 && ethers.isAddress(ctx.service));
    const feeLooksValid: boolean = $derived(typeof ctx.feeCollection === 'string' && ctx.feeCollection.length === 42 && ethers.isAddress(ctx.feeCollection));
    const advancedValid: boolean = $derived(serviceLooksValid && feeLooksValid && parsed.invalid.length === 0);
    const canContinue: boolean = $derived(mode === 'fast' ? true : advancedValid);

    function next() {
        if (mode === 'advanced') {
            ctx.initialConditions = parsed.valid;
        }

        // persist one more time before navigating
        createGroupContext.set({
            ...ctx,
            profile: { ...ctx.profile },
            initialConditions: [...ctx.initialConditions]
        });

        const ready: boolean = canContinue;
        if (!ready) { return; }

        openStep({
            title: 'Review',
            component: ReviewStep,
            props: { context: ctx, setGroup },
            onClose: () => {
                resetCreateGroupContext();
            }
        });
    }
</script>

<FlowStepScaffold
  {...CREATE_GROUP_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Settings"
  subtitle="Name, symbol, description, and image."
>

    <p style="font-size:12.5px;color:{T.inkMuted};margin:0;">Choose a setup mode for your group.</p>

    <!-- Mode selector -->
    <div style="display:flex;flex-direction:column;gap:8px;">
        <label style="
            display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;cursor:pointer;
            border:1px solid {mode === 'fast' ? 'rgba(88,73,212,0.25)' : T.hairlineSoft};
            background:{mode === 'fast' ? T.primaryFaint : T.surface};
            transition:background .12s,border-color .12s;
        ">
            <input
                type="radio"
                name="group-settings-mode"
                style="accent-color:{T.primary};margin-top:2px;flex-shrink:0;"
                checked={mode === 'fast'}
                onchange={() => (mode = 'fast')}
                data-popup-initial-input
            />
            <div>
                <div style="font-size:13px;font-weight:580;color:{T.ink};">Simple</div>
                <div style="font-size:11.5px;color:{T.inkMuted};margin-top:2px;line-height:1.4;">Use your wallet for fee collection, no service contract, no initial conditions.</div>
            </div>
        </label>

        <label style="
            display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;cursor:pointer;
            border:1px solid {mode === 'advanced' ? 'rgba(88,73,212,0.25)' : T.hairlineSoft};
            background:{mode === 'advanced' ? T.primaryFaint : T.surface};
            transition:background .12s,border-color .12s;
        ">
            <input
                type="radio"
                name="group-settings-mode"
                style="accent-color:{T.primary};margin-top:2px;flex-shrink:0;"
                checked={mode === 'advanced'}
                onchange={() => (mode = 'advanced')}
            />
            <div>
                <div style="font-size:13px;font-weight:580;color:{T.ink};">Advanced</div>
                <div style="font-size:11.5px;color:{T.inkMuted};margin-top:2px;line-height:1.4;">Set custom service and fee collection addresses and initial conditions.</div>
            </div>
        </label>
    </div>

    {#if mode === 'advanced'}
        <div style="display:flex;flex-direction:column;gap:12px;">
            <!-- Service -->
            <div style="display:flex;flex-direction:column;gap:6px;">
                <label style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;display:flex;align-items:center;gap:4px;">
                    Service <Tooltip content="Service contract address for the group." />
                </label>
                <input
                    type="text"
                    style="width:100%;padding:10px 14px;border:1px solid {!serviceLooksValid && ctx.service ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontMono};font-size:12px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                    bind:value={ctx.service}
                    placeholder="0x…"
                />
                {#if ctx.service && !serviceLooksValid}
                    <div style="font-size:11.5px;color:{T.negative};">Invalid address</div>
                {:else if serviceLooksValid}
                    <div style="font-size:11.5px;color:{T.positive};">Looks good</div>
                {/if}
            </div>

            <!-- Fee collection -->
            <div style="display:flex;flex-direction:column;gap:6px;">
                <label style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;display:flex;align-items:center;gap:4px;">
                    Fee collection <Tooltip content="Where fees are collected to." />
                </label>
                <input
                    type="text"
                    style="width:100%;padding:10px 14px;border:1px solid {!feeLooksValid && ctx.feeCollection ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontMono};font-size:12px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                    bind:value={ctx.feeCollection}
                    placeholder="0x…"
                />
                {#if ctx.feeCollection && !feeLooksValid}
                    <div style="font-size:11.5px;color:{T.negative};">Invalid address</div>
                {:else if feeLooksValid}
                    <div style="font-size:11.5px;color:{T.positive};">Looks good</div>
                {/if}
            </div>

            <!-- Initial conditions -->
            <div style="display:flex;flex-direction:column;gap:6px;">
                <label style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;display:flex;align-items:center;gap:4px;">
                    Initial conditions <Tooltip content="Comma-separated list of addresses added at creation time." />
                </label>
                <input
                    type="text"
                    style="width:100%;padding:10px 14px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontMono};font-size:12px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                    bind:value={initialConditionsStr}
                    placeholder="0xabc…, 0xdef…"
                />
                <div style="display:flex;gap:8px;align-items:center;">
                    <span style="font-size:11.5px;color:{T.inkMuted};">{parsed.valid.length} valid</span>
                    {#if parsed.invalid.length > 0}
                        <span style="font-size:11.5px;color:{T.negative};">{parsed.invalid.length} invalid</span>
                    {/if}
                </div>

                {#if parsed.valid.length > 0}
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        {#each parsed.valid as addr}
                            <span style="padding:2px 8px;border-radius:9999px;border:1px solid {T.hairline};font-family:{T.fontMono};font-size:10px;color:{T.inkMuted};">{addr.slice(0,10)}…</span>
                        {/each}
                    </div>
                {/if}

                {#if parsed.invalid.length > 0}
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        {#each parsed.invalid as bad}
                            <span style="padding:2px 8px;border-radius:9999px;background:{T.negativeSoft};color:{T.negative};font-family:{T.fontMono};font-size:10px;">{bad.slice(0,10)}…</span>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}

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
