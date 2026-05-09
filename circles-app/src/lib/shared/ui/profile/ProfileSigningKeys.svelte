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
    import type { Address } from '@circles-sdk/utils';
    import { T } from '$lib/design-system/tokens.js';

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
    <div style="font-size:12px;color:{T.negative};background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);border-radius:10px;padding:10px 14px;">{error}</div>
{/if}

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:16px;box-shadow:{T.shadow.xs};">
    {#if showHeader}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <h3 style="font-size:13px;font-weight:600;color:{T.ink};margin:0;">Signing keys</h3>
                <span style="font-size:11px;color:{T.inkMuted};">Operator/app keys</span>
            </div>
            {#if !readonly}
                <button style="display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.ink};cursor:pointer;font-family:{T.fontSans};font-size:12px;" onclick={handleAddSigningKey}>
                    <Lucide icon={LPlus} size={14} ariaLabel="" />
                    Add signing key
                </button>
            {/if}
        </div>
    {/if}

    {#if loading}
        <div style="font-size:13px;color:{T.inkMuted};">Loading…</div>
    {:else}
        <ul style="display:flex;flex-direction:column;gap:4px;list-style:none;margin:0;padding:0;">
            {#each Object.entries(signingKeys) as [fp, meta] (fp)}
                <li style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
                    <code style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:{T.fontMono};color:{T.ink};">{fp}</code>
                    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                        {#if !readonly}
                            <button style="width:26px;height:26px;border-radius:8px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" title="Revoke" onclick={() => revokeSigningKey(fp)}>
                                <Lucide icon={LBan} size={14} ariaLabel="" />
                            </button>
                            <button style="width:26px;height:26px;border-radius:8px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" title="Remove" onclick={() => removeSigningKey(fp)}>
                                <Lucide icon={LTrash2} size={14} ariaLabel="" />
                            </button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>

        {#if Object.keys(signingKeys).length === 0}
            <div style="font-size:13px;color:{T.inkMuted};">No signing keys.</div>
        {/if}
    {/if}
</section>

{#if !readonly && showHeader}
    <div style="display:flex;justify-content:flex-end;">
        <button style="height:32px;padding:0 16px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);" onclick={saveSigningKeys} disabled={loading || !avatar}>Save</button>
    </div>
{/if}
