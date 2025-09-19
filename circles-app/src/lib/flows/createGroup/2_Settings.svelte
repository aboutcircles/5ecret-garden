<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import Tooltip from '../../components/Tooltip.svelte';
    import { ethers } from 'ethers';
    import { popupControls } from '$lib/stores/popUp';
    import Review from './3_Review.svelte';
    import { wallet } from '$lib/stores/wallet.svelte';
    import {
        createGroupContext,
        type CreateGroupFlowContext
    } from './context';

    interface Props {
        context: CreateGroupFlowContext;
        setGroup?: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => void;
    }

    let { context, setGroup }: Props = $props();

    // Fallback to store if no explicit context is provided
    let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);
    let initialConditionsStr: string = $state((ctx.initialConditions ?? []).join(', '));

    // Defaults
    $effect(() => {
        const zero = '0x0000000000000000000000000000000000000000';
        const mustDefault: boolean = ctx.feeCollection === zero && !!$wallet?.address;
        if (mustDefault) {
            ctx.feeCollection = $wallet!.address as `0x${string}`;
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
    const canContinue: boolean = $derived(serviceLooksValid && feeLooksValid && parsed.invalid.length === 0);

    function next() {
        ctx.initialConditions = parsed.valid;

        // persist one more time before navigating
        createGroupContext.set({
            ...ctx,
            profile: { ...ctx.profile },
            initialConditions: [...ctx.initialConditions]
        });

        const ready: boolean = canContinue;
        if (!ready) { return; }

        popupControls.open({
            title: 'Review',
            component: Review,
            props: { context: ctx, setGroup }
        });
    }
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">Service, fee collection and optional initial conditions.</p>

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

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary text-white" disabled={!canContinue} onclick={next}>
            Continue
        </button>
    </div>
</FlowDecoration>
