<script lang="ts">
    import { onMount } from 'svelte';
    import { popupControls, popupState } from '$lib/shared/state/popup';
    import { runTask } from '$lib/shared/utils/tasks';
import { AddSigningKey } from '$lib/shared/ui/profile';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { Plus as LPlus, Trash2 as LTrash2, Ban as LBan } from 'lucide';

    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/areas/market/offers';
    import { removeProfileFromCache } from '$lib/shared/utils/profile';
    import type { Address } from '@aboutcircles/sdk-types';

    interface Props {
        avatar: Address | null;
        pinApiBase?: string;
        readonly?: boolean;
        showHeader?: boolean;
        onAddSigningKey?: () => void;
    }

    let { avatar, pinApiBase, readonly = true, showHeader = true, onAddSigningKey }: Props = $props();

    let loading = $state(false);
    let error = $state<string | null>(null);
    let signingKeys = $state<Record<string, any>>({});

    let awaitingAddKeyClose = $state(false);

    function getBindings(): ProfilesBindings {
        return getProfilesBindings({ pinApiBase }).bindings;
    }

    async function loadSigningKeys(): Promise<void> {
        loading = true;
        error = null;
        signingKeys = {};

        try {
            if (!avatar) return;
            const { profile } = await loadProfileOrInit(getBindings(), avatar);
            const skObj =
                profile.signingKeys && typeof profile.signingKeys === 'object'
                    ? profile.signingKeys
                    : {};
            signingKeys = { ...(skObj as Record<string, any>) };
        } catch (e: any) {
            error = String(e?.message ?? e);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        void loadSigningKeys();
    });

    $effect(() => {
        // Reload if avatar changes
        const _ = avatar;
        void loadSigningKeys();
    });

    function openAddSigningKey(): void {
        if (!avatar) return;
        awaitingAddKeyClose = true;
        popupControls.open({
            title: 'Add signing key',
            component: AddSigningKey,
            props: { avatar, pinApiBase }
        });
    }

    const handleAddSigningKey = () => {
        if (onAddSigningKey) {
            onAddSigningKey();
            return;
        }
        openAddSigningKey();
    };

    $effect(() => {
        // Reload after the AddSigningKey popup closes.
        const isClosed = $popupState.content === null;
        if (!awaitingAddKeyClose) return;
        if (!isClosed) return;

        awaitingAddKeyClose = false;
        void loadSigningKeys();
    });

    function removeSigningKey(fp: string): void {
        if (readonly) return;
        const next = { ...signingKeys };
        delete next[fp];
        signingKeys = next;
    }

    function revokeSigningKey(fp: string): void {
        if (readonly) return;
        const meta = signingKeys[fp];
        if (!meta) return;
        signingKeys = {
            ...signingKeys,
            [fp]: {
                ...meta,
                revokedAt: Math.floor(Date.now() / 1000)
            }
        };
    }

    async function saveSigningKeys(): Promise<void> {
        if (!avatar) return;
        if (readonly) return;

        const bindings = getBindings();
        await runTask({
            name: 'Saving signing keys…',
            promise: (async () => {
                const cid = await rebaseAndSaveProfile(bindings, avatar!, (p: any) => {
                    p.signingKeys = signingKeys;
                });
                await bindings.updateAvatarProfileDigest(avatar!, cid);
                removeProfileFromCache(avatar!);
            })()
        });
    }
</script>

{#if error}
    <div class="alert alert-error text-xs">{error}</div>
{/if}

<section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm">
    {#if showHeader}
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
                <h3 class="font-semibold text-sm m-0">Signing keys</h3>
                <span class="text-[11px] opacity-60">Operator/app keys</span>
            </div>
            {#if !readonly}
                <button class="btn btn-xs" onclick={handleAddSigningKey}>
                    <Lucide icon={LPlus} size={16} class="shrink-0 stroke-current" ariaLabel="" />
                    Add signing key
                </button>
            {/if}
        </div>
    {/if}

    {#if loading}
        <div class="text-sm opacity-70">Loading…</div>
    {:else}
        <ul class="space-y-1">
            {#each Object.entries(signingKeys) as [fp, meta] (fp)}
                <li class="flex justify-between items-center text-xs">
                    <code class="truncate">{fp}</code>
                    <div class="flex items-center gap-2">
                        {#if !readonly}
                            <button class="btn btn-ghost btn-xs" title="Revoke" onclick={() => revokeSigningKey(fp)}>
                                <Lucide icon={LBan} size={14} class="shrink-0 stroke-current" ariaLabel="" />
                            </button>
                            <button class="btn btn-ghost btn-xs" title="Remove" onclick={() => removeSigningKey(fp)}>
                                <Lucide icon={LTrash2} size={14} class="shrink-0 stroke-current" ariaLabel="" />
                            </button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>

        {#if Object.keys(signingKeys).length === 0}
            <div class="text-sm opacity-70">No signing keys.</div>
        {/if}
    {/if}
</section>

{#if !readonly && showHeader}
    <div class="flex justify-end">
        <button class="btn btn-primary btn-sm" onclick={saveSigningKeys} disabled={loading || !avatar}>Save</button>
    </div>
{/if}
