<script lang="ts">
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
    import { ethers } from 'ethers';
    import { openStep } from '$lib/shared/flow/runtime';
    import CreateStep from './4_Create.svelte';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';
    import { resetCreateGroupContext } from './context';
    import type { ReviewStepProps } from '$lib/shared/flow/contracts';

    type Props = ReviewStepProps<CreateGroupFlowContext> & {
        setGroup?: (address: string) => void;
    };

    let { context, setGroup }: Props = $props();

    // Fallback to store if no explicit context is provided
    let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);
    let initialConditionsStr: string = $state((ctx.initialConditions ?? []).join(', '));
    let mode: 'fast' | 'advanced' = $state(ctx.settingsMode ?? 'fast');

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
            title: 'Review and confirm',
            component: CreateStep,
            props: { context: ctx, setGroup },
            onClose: () => {
                resetCreateGroupContext();
            }
        });
    }
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">
        Choose a fast lane setup or configure advanced settings.
    </p>

    <div class="mt-4 space-y-3">
        <label class="flex items-start gap-3 p-3 rounded-xl border border-base-300 cursor-pointer">
            <input
                type="radio"
                name="group-settings-mode"
                class="radio radio-xs mt-1"
                checked={mode === 'fast'}
                onchange={() => (mode = 'fast')}
            />
            <div>
                <div class="text-sm font-semibold">Simple</div>
                <div class="text-xs text-base-content/70">
                    Use your wallet for fee collection, no service contract, no initial conditions.
                </div>
            </div>
        </label>
        <label class="flex items-start gap-3 p-3 rounded-xl border border-base-300 cursor-pointer">
            <input
                type="radio"
                name="group-settings-mode"
                class="radio radio-xs mt-1"
                checked={mode === 'advanced'}
                onchange={() => (mode = 'advanced')}
            />
            <div>
                <div class="text-sm font-semibold">Advanced</div>
                <div class="text-xs text-base-content/70">
                    Set custom service and fee collection addresses and initial conditions.
                </div>
            </div>
        </label>
    </div>

    {#if mode === 'advanced'}
        <!-- Row: Service -->
        <label class="form-control mt-4">
            <div class="label">
          <span class="label-text">
            Service <Tooltip content="Service contract address for the group." />
          </span>
            </div>
            <input
                    type="text"
                    class="input input-bordered w-full"
                    bind:value={ctx.service}
                    placeholder="0x…"
            />
            <div class="h-5 text-xs pt-1" class:text-error={!serviceLooksValid} class:text-success={serviceLooksValid}>
                {#if serviceLooksValid}Looks good{/if}{#if !serviceLooksValid}Invalid address{/if}
            </div>
        </label>

        <!-- Row: Fee collection -->
        <label class="form-control">
            <div class="label">
          <span class="label-text">
            Fee collection <Tooltip content="Where fees are collected to." />
          </span>
            </div>
            <input
                    type="text"
                    class="input input-bordered w-full"
                    bind:value={ctx.feeCollection}
                    placeholder="0x…"
            />
            <div class="h-5 text-xs pt-1" class:text-error={!feeLooksValid} class:text-success={feeLooksValid}>
                {#if feeLooksValid}Looks good{/if}{#if !feeLooksValid}Invalid address{/if}
            </div>
        </label>

        <!-- Row: Initial conditions -->
        <label class="form-control">
            <div class="label">
          <span class="label-text">
            Initial conditions
            <Tooltip content="Comma-separated list of addresses added at creation time." />
          </span>
            </div>
            <input
                    type="text"
                    class="input input-bordered w-full"
                    bind:value={initialConditionsStr}
                    placeholder="0xabc…, 0xdef…"
            />
        </label>

        <!-- Row: Tiny summary -->
        <div class="mt-2 text-sm flex items-center gap-3">
            <span class="text-base-content/60">{parsed.valid.length} valid</span>
            {#if parsed.invalid.length > 0}
                <span class="text-error">{parsed.invalid.length} invalid</span>
            {/if}
        </div>

        {#if parsed.valid.length > 0}
            <div class="mt-2 flex flex-wrap gap-2">
                {#each parsed.valid as addr}
                    <span class="badge badge-outline">{addr}</span>
                {/each}
            </div>
        {/if}

        {#if parsed.invalid.length > 0}
            <div class="mt-2 flex flex-wrap gap-2">
                {#each parsed.invalid as bad}
                    <span class="badge badge-error">{bad}</span>
                {/each}
            </div>
        {/if}
    {/if}

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary" disabled={!canContinue} onclick={next}>
            Continue
        </button>
    </div>
</FlowDecoration>
