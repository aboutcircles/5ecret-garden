<!-- lib/profile/ProfileExplorer.svelte -->
<script lang="ts">
    import {onMount} from 'svelte';
    import {popupControls} from '$lib/stores/popup';
    import {runTask} from '$lib/utils/tasks';
    import {avatarState} from '$lib/stores/avatar.svelte';

    import ProfileNamespaces from '$lib/profile/ProfileNamespaces.svelte';
    import ProfileHeaderEditor from '$lib/profile/ProfileHeaderEditor.svelte';
    import AddSigningKey from '$lib/profile/AddSigningKey.svelte';
    // Use Lucide icons instead of inline SVGs
    import Lucide from '$lib/icons/Lucide.svelte';
    import { Plus as LPlus, Trash2 as LTrash2, Ban as LBan } from 'lucide';

    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/offers/profilesBindings';
    import { removeProfileFromCache } from '$lib/utils/profile';
    import type {Address} from '@circles-sdk/utils';

    interface Props {
        avatar?: Address;
        pinApiBase?: string;
        showAdvancedSections?: boolean; // when true (Settings page), show Namespaces + Signing keys
    }

    let {avatar, pinApiBase, showAdvancedSections = false}: Props = $props();

    let resolvedAvatar = $state<Address | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);

    let name = $state('');
    let description = $state('');
    let location = $state('');
    let imageUrl = $state('');
    let previewImageUrl = $state('');
    let namespaces = $state<Record<string, string>>({});
    let signingKeys = $state<Record<string, any>>({});

    // Inline key generation moved to AddSigningKey popup; local generated* state removed

    // editability
    let readonly = $state<boolean>(true);
    let connected = $derived((avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase())
    let ra = $derived((resolvedAvatar ?? '').toLowerCase());
    let isOwner = $derived(!!connected && !!ra && connected === ra);

    $effect(() => {
        readonly = !isOwner;
    });

    function getBindings(): ProfilesBindings {
        return getProfilesBindings({ pinApiBase }).bindings;
    }

    async function loadProfile(): Promise<void> {
        loading = true;
        error = null;

        try {
            // If no explicit avatar is passed, default to the currently connected avatar from app state
            const rawAvatar =
                avatar ?? ((avatarState.avatar?.address as string | undefined) ?? (avatarState.avatar?.avatarInfo?.avatar as string | undefined) ?? '');
            const norm = normalizeAddress(rawAvatar) as Address;
            resolvedAvatar = norm;

            const {profile} = await loadProfileOrInit(getBindings(), norm as Address);

            name = String(profile.name ?? '');
            description = String(profile.description ?? '');
            location = typeof profile.location === 'string' ? profile.location : '';
            imageUrl = typeof profile.imageUrl === 'string' ? profile.imageUrl : '';
            previewImageUrl =
                typeof profile.previewImageUrl === 'string'
                    ? profile.previewImageUrl
                    : '';

            const nsObj =
                profile.namespaces && typeof profile.namespaces === 'object'
                    ? profile.namespaces
                    : {};
            namespaces = {...(nsObj as Record<string, string>)};

            const skObj =
                profile.signingKeys && typeof profile.signingKeys === 'object'
                    ? profile.signingKeys
                    : {};
            signingKeys = {...(skObj as Record<string, any>)};
        } catch (e: any) {
            error = String(e?.message ?? e);
        } finally {
            loading = false;
        }
    }

    function removeSigningKey(fp: string): void {
        if (readonly) return;
        const next = {...signingKeys};
        delete next[fp];
        signingKeys = next;
    }

    function revokeSigningKey(fp: string): void {
        if (readonly) return;
        const meta = signingKeys[fp];
        if (!meta) {
            return;
        }
        signingKeys = {
            ...signingKeys,
            [fp]: {
                ...meta,
                revokedAt: Math.floor(Date.now() / 1000)
            }
        };
    }

    async function saveProfile(): Promise<void> {
        if (!resolvedAvatar) return;
        const bindings = getBindings();
        await runTask({
            name: 'Saving profile…',
            promise: (async () => {
                const cid = await rebaseAndSaveProfile(bindings, resolvedAvatar!, (p: any) => {
                    p.name = name;
                    p.description = description;
                    p.location = location;
                    p.imageUrl = imageUrl || null;
                    p.previewImageUrl = previewImageUrl || null;
                    p.signingKeys = signingKeys;
                    p.namespaces = namespaces;
                });
                await bindings.updateAvatarProfileDigest(resolvedAvatar!, cid);
                removeProfileFromCache(resolvedAvatar!);
            })()
        });
    }

    function openAddSigningKey(): void {
        popupControls.open({
            title: 'Add signing key',
            component: AddSigningKey,
            props: { avatar: resolvedAvatar, pinApiBase }
        });
    }

    function onNamespacesChanged(e: CustomEvent<Record<string, string>>): void {
        namespaces = e.detail;
    }

    onMount(() => {
        void loadProfile();
    });
</script>

<div class="space-y-4">
    {#if error}
        <div class="alert alert-error text-xs">{error}</div>
    {/if}

    <!-- Header editor panel -->
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm">
        <ProfileHeaderEditor
            bind:name
            bind:description
            bind:location
            bind:imageUrl
            bind:previewImageUrl
            readonly={!isOwner}
        />
    </section>

    {#if showAdvancedSections}
        <!-- Namespaces panel -->
        <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-sm m-0">Namespaces</h3>
                <span class="text-[11px] opacity-60">App/profile sources</span>
            </div>
            {#if resolvedAvatar}
                <ProfileNamespaces
                    avatar={resolvedAvatar}
                    {pinApiBase}
                    namespaces={namespaces}
                    readonly={!isOwner}
                    on:namespacesChanged={(e) => onNamespacesChanged(new CustomEvent('namespacesChanged', { detail: e.detail }))}
                />
            {:else}
                <div class="text-sm opacity-70">No avatar resolved.</div>
            {/if}
        </section>

        <!-- Signing keys panel -->
        <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <h3 class="font-semibold text-sm m-0">Signing keys</h3>
                    <span class="text-[11px] opacity-60">Operator/app keys</span>
                </div>
                {#if isOwner}
                    <button class="btn btn-xs" onclick={openAddSigningKey}>
                        <Lucide icon={LPlus} size={16} class="shrink-0 stroke-current" ariaLabel="" />
                        Add signing key
                    </button>
                {/if}
            </div>

            <ul class="space-y-1">
                {#each Object.entries(signingKeys) as [fp, meta] (fp)}
                    <li class="flex justify-between items-center text-xs">
                        <code class="truncate">{fp}</code>
                        <div class="flex items-center gap-2">
                            {#if isOwner}
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
        </section>
    {/if}

    {#if isOwner}
        <div class="flex justify-end">
            <button class="btn btn-primary btn-sm" onclick={saveProfile}>Save</button>
        </div>
    {/if}
</div>
